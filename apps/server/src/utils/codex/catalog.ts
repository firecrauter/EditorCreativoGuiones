import { getStatus } from "./index";
import { thinkingLevels } from "@/lib/modelReasoning";
import type { CodexStatus } from "@toonflow/story";

export const providerId = "codexCli";
export const providerLabel = "Codex CLI · ChatGPT";
export const imageModelId = "codexImage";
export const mediaSource = `export default { id: "codexCli", label: "Codex CLI · ChatGPT", version: "1.0.0", rules: [],
  models: [{ id: "codexImage", label: "Imágenes de Codex · ChatGPT", type: "image", mode: ["text", "singleImage", "multiReference"], imageRatios: ["1:1", "16:9", "9:16"] }],
  async generateImage() { throw new Error("Esta capacidad requiere el puente local de Codex del editor."); },
  async resumeTask() { throw new Error("Esta capacidad requiere el puente local de Codex del editor."); }
};`;

let cached: { expires: number; value: Promise<CodexStatus> } | undefined;
export function catalogStatus(fresh = false) {
  if (fresh || !cached || cached.expires <= Date.now()) {
    const entry = { expires: Date.now() + 15000, value: getStatus() };
    cached = entry;
    entry.value.catch(() => { if (cached === entry) cached = undefined; });
  }
  return cached.value;
}

export async function textProvider() {
  const status = await catalogStatus();
  return { id: providerId, label: providerLabel, apiUrl: "http://127.0.0.1", apiKey: "", protocol: "openai-responses" as const,
    models: status.models.map(model => {
      const efforts = Object.fromEntries(thinkingLevels.flatMap(level => {
        const wire = level === "off" ? "none" : level;
        return model.reasoningEfforts.includes(wire) ? [[level, wire]] : [];
      }));
      return { id: model.id, label: model.label, reasoningEfforts: Object.keys(efforts).some(level => level !== "off") ? efforts : false as const };
    }),
  };
}

export async function mediaAvailable() {
  return (await catalogStatus()).imageGeneration;
}
