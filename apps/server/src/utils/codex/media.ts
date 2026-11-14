import { readFile } from "@toonflow/file";
import { resolveWorkspacePath } from "@/utils/workspace/files";
import type { loadMediaProviderSource } from "@/utils/media/provider";
import { start, readJob, cancel } from "./index";
import { imageModelId } from "./catalog";

type RuntimeProvider = Awaited<ReturnType<typeof loadMediaProviderSource>>;
export function bindMediaProvider(provider: RuntimeProvider, directory?: string) {
  const cwd = directory ?? "";
  async function result(id: string) {
    const signal = provider.signal;
    const abort = () => { void cancel(cwd, id).catch(() => {}); };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    try {
      for (;;) {
        signal?.throwIfAborted();
        const job = await readJob(cwd, id);
        if (job.status === "completed") {
          if (job.result?.kind !== "image") throw new Error("El trabajo de Codex no contiene una imagen.");
          const { path } = await resolveWorkspacePath(cwd, job.result.path);
          return [{ type: "binary" as const, mediaType: "image" as const, mimeType: job.result.mimeType, data: new Uint8Array(await readFile(path, { signal })) }];
        }
        if (job.status === "failed" || job.status === "cancelled") throw new Error(job.error || job.stage);
        await new Promise<void>(resolve => setTimeout(resolve, 600));
      }
    } finally { signal?.removeEventListener("abort", abort); }
  }
  return Object.assign(provider, {
    async generateImage(request: ImageRequest) {
      if (!cwd) throw new Error("Codex necesita un proyecto abierto para generar imágenes.");
      provider.signal?.throwIfAborted();
      if (request.n !== undefined && request.n !== 1) throw new Error("Codex genera una sola imagen por pedido en este editor.");
      if (request.model !== imageModelId || request.mask) throw new Error("Este proveedor admite una imagen o edición con referencias; no admite máscaras.");
      if ((request.images?.length ?? 0) > 4) throw new Error("Codex admite hasta cuatro referencias por pedido en el editor.");
      const references = (request.images ?? []).map(image => {
        if (!image.name) throw new Error("Las referencias de Codex deben ser archivos del proyecto.");
        return image.name;
      });
      const job = await start(cwd, { directory: cwd, id: crypto.randomUUID(), action: "image", prompt: `${request.prompt}${request.ratio ? `\nComposición solicitada: ${request.ratio}.` : ""}${request.size ? `\nTamaño solicitado: ${request.size}.` : ""}`, context: null, targetId: null, references });
      try { await provider.saveTaskData?.({ codexJobId: job.id }); }
      catch (error) { await cancel(cwd, job.id).catch(() => {}); throw error; }
      return result(job.id);
    },
    async resumeTask(data: Record<string, unknown>) {
      if (!cwd) throw new Error("Codex necesita el proyecto original para recuperar una imagen.");
      if (typeof data.codexJobId !== "string" || !/^[a-f0-9-]{36}$/.test(data.codexJobId)) throw new Error("El trabajo de Codex guardado no es válido.");
      return result(data.codexJobId);
    },
  });
}
