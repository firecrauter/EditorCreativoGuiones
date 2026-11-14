import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { lstat } from "@toonflow/file";

type Message = { id?: number | string; method?: string; params?: any; result?: any; error?: { code?: number; message?: string } };
type Pending = { resolve(value: any): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> };

export class CodexClient {
  private process: ChildProcessWithoutNullStreams;
  private pending = new Map<number, Pending>();
  private listeners = new Set<(message: Message) => void>();
  private requestHandlers = new Set<(message: Message) => boolean>();
  private nextId = 1;
  stopped = false;

  constructor(command: string, args: string[]) {
    const environment = { ...process.env };
    for (const key of Object.keys(environment)) if (/api_?key|access_?token|auth_?token|secret/i.test(key)) delete environment[key];
    this.process = spawn(command, [...args, "app-server", "--listen", "stdio://", "-c", 'model_provider="openai"',
      "--disable", "shell_tool", "--disable", "hooks", "--disable", "multi_agent", "--disable", "apps", "--disable", "remote_plugin", "--disable", "shell_snapshot",
      "-c", 'web_search="disabled"', "-c", "project_doc_max_bytes=0"], { env: environment, shell: false, windowsHide: true, stdio: "pipe" });
    // Stderr can include machine-specific paths. Drain it without storing credentials or raw diagnostics.
    this.process.stderr.on("data", () => {});
    this.process.stdin.on("error", () => { this.process.kill(); });
    const lines = createInterface({ input: this.process.stdout });
    lines.on("line", line => {
      if (line.length > 64 * 1024 * 1024) { this.close(); return; }
      let message: Message;
      try { message = JSON.parse(line); } catch { return; }
      if (!message.method && typeof message.id === "number" && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id)!; this.pending.delete(message.id); clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(`Codex rechazó ${message.error.code ?? "la solicitud"}: ${message.error.message?.slice(0, 1000) ?? "error del protocolo"}`));
        else pending.resolve(message.result);
      } else if (message.method && message.id !== undefined) {
        if ([...this.requestHandlers].some(handler => handler(message))) return;
        // Creative jobs have no permission to execute commands, change files or call connected apps.
        const result = message.method === "item/permissions/requestApproval" ? { permissions: {}, scope: "turn" }
          : /requestApproval$/.test(message.method) ? { decision: "decline" } : undefined;
        this.send(result ? { id: message.id, result } : { id: message.id, error: { code: -32601, message: "Esta integración sólo permite texto e imágenes integradas." } });
      } else if (message.method) {
        for (const listener of this.listeners) listener(message);
      }
    });
    const ended = () => {
      this.stopped = true;
      for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error("Se cerró la conexión con Codex CLI.")); }
      this.pending.clear();
      for (const listener of this.listeners) listener({ method: "editor/disconnected" });
    };
    this.process.once("error", ended); this.process.once("exit", ended);
  }

  private send(message: unknown) { if (!this.stopped) this.process.stdin.write(JSON.stringify(message) + "\n"); }
  async request(method: string, params: unknown = {}, timeout = 30000): Promise<any> {
    if (this.stopped) throw new Error("Codex CLI no está conectado.");
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Codex no respondió a ${method}.`)); }, timeout);
      this.pending.set(id, { resolve, reject, timer }); this.send({ id, method, params });
    });
  }
  subscribe(listener: (message: Message) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  onRequest(handler: (message: Message) => boolean) { this.requestHandlers.add(handler); return () => { this.requestHandlers.delete(handler); }; }
  async initialize() {
    await this.request("initialize", { clientInfo: { name: "editorCreativo", version: "0.3.0" }, capabilities: { experimentalApi: true } });
    this.send({ method: "initialized", params: {} });
  }
  close() { this.process.stdin.end(); const timer = setTimeout(() => { if (!this.stopped) this.process.kill(); }, 1000); timer.unref(); }
}

let clientPromise: Promise<CodexClient> | undefined;
export async function getClient(): Promise<CodexClient> {
  if (clientPromise) {
    const current = await clientPromise;
    if (!current.stopped) return current;
    clientPromise = undefined;
  }
  clientPromise = (async () => {
    const command = process.env.EDITOR_CODEX_PATH || Bun.which("codex.exe") || Bun.which("codex.cmd") || Bun.which("codex");
    if (!command) throw new Error("No se encontró Codex CLI en PATH. Instalalo e iniciá sesión con ChatGPT desde la terminal.");
    let executable = command;
    let args: string[] = [];
    const npmEntry = join(dirname(command), "node_modules/@openai/codex/bin/codex.js");
    if (process.platform === "win32" && await lstat(npmEntry).then(info => info.isFile(), () => false)) {
      executable = Bun.which("node.exe") || join(dirname(command), "node.exe"); args = [npmEntry];
    }
    const client = new CodexClient(executable, args);
    try { await client.initialize(); return client; }
    catch (error) { client.close(); throw error; }
  })();
  try { return await clientPromise; } catch (error) { clientPromise = undefined; throw error; }
}
