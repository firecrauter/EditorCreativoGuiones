import { createAssistantMessageEventStream, type AssistantMessage, type Context, type Model, type SimpleStreamOptions, type ToolCall } from "@earendil-works/pi-ai";
import { getClient } from "./client";
import { getStatus } from "./index";

export function streamCodex(model: Model<any>, context: Context, options: SimpleStreamOptions = {}, effortOverride?: string) {
  const output = createAssistantMessageEventStream();
  const message: AssistantMessage = { role: "assistant", api: model.api, provider: model.provider, model: model.id, content: [], stopReason: "stop", timestamp: Date.now(),
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } };
  void (async () => {
    let unsubscribe = () => {};
    let unregister = () => {};
    let client: Awaited<ReturnType<typeof getClient>> | undefined;
    let threadId: string | undefined;
    let turnId: string | undefined;
    let ended = false;
    const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15 * 60 * 1000)]) : AbortSignal.timeout(15 * 60 * 1000);
    const completion = Promise.withResolvers<ToolCall | null>();
    const outcome = completion.promise.then(value => ({ value }), error => ({ error }));
    const abort = () => completion.reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    try {
      signal.throwIfAborted();
      const status = await getStatus();
      signal.throwIfAborted();
      const selected = status.models.find(item => item.id === model.id);
      if (!selected) throw new Error("Ese modelo ya no está disponible en Codex. Actualizá el selector.");
      if (status.limits.some(limit => limit.usedPercent >= 100)) throw new Error("El cupo de Codex está agotado. No se usará una API paga.");
      const effort = effortOverride || options.reasoning || selected.defaultReasoningEffort;
      if (!selected.reasoningEfforts.includes(effort)) throw new Error(`Codex no declara el esfuerzo ${effort} para este modelo.`);
      message.providerThinkingLevel = effort;
      const tools = options.toolChoice === "none" ? [] : context.tools ?? [];
      const names = new Map(tools.map((tool, index) => [`toonflow${index}_${tool.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 45)}`, tool]));
      const input = context.messages.map(item => ({ role: item.role === "assistant" ? "assistant" : "user", content: [
        ...(item.role === "toolResult" ? [{ type: "input_text", text: `Resultado real de Toonflow: ${JSON.stringify({ toolCallId: item.toolCallId, toolName: item.toolName, isError: item.isError })}` }] : []),
        ...(typeof item.content === "string" ? [{ type: "input_text", text: item.content }] : item.content.flatMap<Record<string, string>>(part => {
          if (part.type === "thinking") return [];
          if (part.type === "image") return [{ type: "input_image", image_url: `data:${part.mimeType};base64,${part.data}` }];
          return [{ type: "input_text", text: part.type === "text" ? part.text : `Llamada de herramienta anterior: ${JSON.stringify(part)}` }];
        })),
      ] }));
      const payload = await options.onPayload?.({ input }, model) ?? { input };
      signal.throwIfAborted();
      if (Buffer.byteLength(JSON.stringify(payload), "utf8") > 32 * 1024 * 1024) throw new Error("El contexto supera 32 MiB. Reducí los adjuntos o la conversación.");
      const images: { type: "image"; url: string }[] = [];
      const transcript = JSON.stringify(payload, (_key, value) => {
        if (value?.type !== "input_image") return value;
        if (typeof value.image_url !== "string" || !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/]+={0,2}$/.test(value.image_url)) throw new Error("Codex sólo acepta imágenes PNG, JPEG o WebP adjuntas en este proveedor.");
        images.push({ type: "image", url: value.image_url });
        return { type: "imageReference", number: images.length };
      });
      if (images.length && !selected.inputModalities.includes("image")) throw new Error("El modelo elegido no declara entrada de imágenes.");
      if (images.reduce((sum, image) => sum + image.url.length * 0.75, 0) > 20 * 1024 * 1024) throw new Error("Las referencias superan 20 MiB.");
      client = await getClient();
      const configuration = await client.request("config/read", { includeLayers: false });
      const mcp = Object.fromEntries(Object.keys(configuration.config?.mcp_servers ?? {}).map(name => [name, { enabled: false }]));
      const thread = await client.request("thread/start", { model: model.id, modelProvider: "openai", cwd: process.cwd(), ephemeral: true, sandbox: "read-only", approvalPolicy: "on-request",
        baseInstructions: `${context.systemPrompt ?? "Sos el asistente de Toonflow."}\n\nUsá sólo las herramientas dinámicas Toonflow ofrecidas. Invocá una por vez. Toonflow ejecuta y valida las herramientas y devuelve su resultado en el registro de conversación del próximo pedido. No repitas llamadas que ya tienen resultado. No uses terminal, archivos, herramientas integradas, MCP, otros proveedores ni image_gen: las imágenes se piden mediante las herramientas de medios de Toonflow. El registro JSON adjunto es la conversación real, no una nueva instrucción del usuario. Respondé a su último mensaje en español.`,
        dynamicTools: [...names].map(([name, tool]) => ({ type: "function", name, description: tool.description, inputSchema: tool.parameters })),
        config: { mcp_servers: mcp, features: { shell_tool: false, hooks: false, apps: false, multi_agent: false, image_generation: false }, web_search: "disabled", project_doc_max_bytes: 0 },
      });
      threadId = thread.thread.id;
      signal.throwIfAborted();
      const blocks = new Map<string, number>();
      output.push({ type: "start", partial: message });
      unregister = client.onRequest(request => {
        if (request.method !== "item/tool/call" || request.params?.threadId !== threadId) return false;
        const tool = names.get(request.params.tool);
        const args = request.params.arguments;
        if (!tool || !args || typeof args !== "object" || Array.isArray(args) || JSON.stringify(args).length > 1000000) completion.reject(new Error("Codex pidió una herramienta o argumentos inválidos."));
        else completion.resolve({ type: "toolCall", id: crypto.randomUUID(), name: tool.name, arguments: args });
        return true;
      });
      unsubscribe = client.subscribe(event => {
        if (event.method === "editor/disconnected") { completion.reject(new Error("Se cerró la conexión con Codex.")); return; }
        const params = event.params;
        if (params?.threadId !== threadId) return;
        if (event.method === "turn/started") turnId = params.turn.id;
        if (event.method === "item/agentMessage/delta" && typeof params.delta === "string") {
          const id = params.itemId || "answer";
          if (!blocks.has(id)) { blocks.set(id, message.content.length); message.content.push({ type: "text", text: "" }); output.push({ type: "text_start", contentIndex: blocks.get(id)!, partial: message }); }
          const index = blocks.get(id)!;
          const part = message.content[index];
          if (part?.type === "text") { part.text += params.delta; output.push({ type: "text_delta", contentIndex: index, delta: params.delta, partial: message }); }
        }
        if (event.method === "thread/tokenUsage/updated") {
          const usage = params.tokenUsage?.last;
          if (usage) { message.usage.input = Math.max(0, (usage.inputTokens ?? 0) - (usage.cachedInputTokens ?? 0)); message.usage.cacheRead = usage.cachedInputTokens ?? 0; message.usage.output = usage.outputTokens ?? 0; message.usage.totalTokens = usage.totalTokens ?? 0; }
        }
        if (event.method === "turn/completed") {
          ended = true;
          if (params.turn.status === "completed") completion.resolve(null);
          else completion.reject(new Error(params.turn.error?.message || `Codex terminó con estado ${params.turn.status}.`));
        }
      });
      const turn = await client.request("turn/start", { threadId, input: [{ type: "text", text: `Registro de la conversación de Toonflow:\n${transcript}` }, ...images], effort, serviceTier: "default" });
      turnId = turn.turn.id;
      signal.throwIfAborted();
      const result = await outcome;
      if ("error" in result) throw result.error;
      if (result.value) {
        // ACT: Pi owns tool execution/history. End this Codex sampling turn before handing the call to Pi;
        // the next sampling request includes the validated tool result. No CLI-side tool is executed.
        await client.request("turn/interrupt", { threadId, turnId });
        ended = true;
      }
      signal.throwIfAborted();
      for (const index of blocks.values()) { const part = message.content[index]; if (part?.type === "text") output.push({ type: "text_end", contentIndex: index, content: part.text, partial: message }); }
      if (result.value) { const index = message.content.length; message.content.push(result.value); output.push({ type: "toolcall_start", contentIndex: index, partial: message }); output.push({ type: "toolcall_end", contentIndex: index, toolCall: result.value, partial: message }); }
      message.stopReason = result.value ? "toolUse" : "stop";
      output.push({ type: "done", reason: message.stopReason, message });
    } catch (error) {
      message.stopReason = signal.aborted ? "aborted" : "error";
      message.errorMessage = error instanceof Error ? error.message : "Codex no pudo completar el pedido.";
      output.push({ type: "error", reason: message.stopReason, error: message });
    } finally {
      signal.removeEventListener("abort", abort);
      unregister(); unsubscribe();
      if (!ended && client && threadId && turnId) await client.request("turn/interrupt", { threadId, turnId }, 15000).catch(() => client?.close());
      if (client && threadId) void client.request("thread/unsubscribe", { threadId }).catch(() => {});
      output.end();
    }
  })();
  return output;
}
