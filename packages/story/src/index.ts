import { z } from "zod";

const text = z.string().max(100000);
const imagePath = z.string().max(4096).regex(/^(?:|assets\/[a-zA-Z0-9/._-]+\.(?:png|jpg|jpeg|webp))$/);
export const characterFields = { name: text, role: text, want: text, conflict: text, arc: text, relations: text, notes: text };
export const characterSchema = z.strictObject({ id: z.uuid(), ...characterFields, portrait: imagePath });
export const beatFields = { title: text, scene: text, script: text, duration: z.number().int().min(1).max(3600), color: z.string().regex(/^#[a-f\d]{6}$/i), causeId: z.union([z.uuid(), z.literal("")]), characterIds: z.array(z.uuid()).max(1000) };
export const beatSchema = z.strictObject({ id: z.uuid(), ...beatFields });
export const shotFields = { beatId: z.uuid(), title: text, description: text, framing: text, camera: text, duration: z.number().int().min(1).max(3600), imagePrompt: text, characterIds: z.array(z.uuid()).max(1000) };
export const shotSchema = z.strictObject({ id: z.uuid(), ...shotFields, image: imagePath });
const storyFields = { format: z.literal("editorCreativoStory"), title: text, logline: text, beats: z.array(beatSchema).max(10000), characters: z.array(characterSchema).max(1000) };
export const storySchema = z.strictObject({ ...storyFields, version: z.literal(2), shots: z.array(shotSchema).max(10000), appliedCodexRuns: z.array(z.uuid()).max(20000) }).superRefine((value, context) => {
  const beats = new Set(value.beats.map(beat => beat.id));
  const characters = new Set(value.characters.map(character => character.id));
  const shots = new Set(value.shots.map(shot => shot.id));
  if (beats.size !== value.beats.length || characters.size !== value.characters.length || shots.size !== value.shots.length
    || value.beats.some(beat => beat.causeId === beat.id || beat.causeId && !beats.has(beat.causeId) || beat.characterIds.some(id => !characters.has(id)))
    || value.shots.some(shot => !beats.has(shot.beatId) || shot.characterIds.some(id => !characters.has(id)))) {
    context.addIssue({ code: "custom", message: "La historia tiene identificadores repetidos o vínculos inválidos." });
  }
});
export type Story = z.infer<typeof storySchema>;
export function parseStory(value: unknown): Story {
  const legacy = z.strictObject({ ...storyFields, version: z.literal(1) });
  if (typeof value === "object" && value && "version" in value && value.version === 1) {
    return storySchema.parse({ ...legacy.parse(value), version: 2, shots: [], appliedCodexRuns: [] });
  }
  return storySchema.parse(value);
}
export function emptyStory(): Story { return { format: "editorCreativoStory", version: 2, title: "", logline: "", beats: [], characters: [], shots: [], appliedCodexRuns: [] }; }

export const codexActions = ["script", "structure", "character", "storyboard", "portrait", "sketch", "image"] as const;
export const actionLabels: Record<typeof codexActions[number], string> = { script: "Proponer guion", structure: "Analizar estructura", character: "Desarrollar personaje", storyboard: "Desglosar en planos", portrait: "Generar retrato", sketch: "Generar boceto", image: "Generar imagen" };
const sourceId = z.uuid().nullable();
export const proposalSchemas = {
  script: z.strictObject({ summary: text, title: text, logline: text, beats: z.array(z.strictObject({ sourceId, ...beatFields })).max(100) }),
  structure: z.strictObject({ summary: text, notes: z.array(z.strictObject({ beatId: z.uuid(), note: text })).max(100), changes: z.array(z.strictObject({ beatId: z.uuid(), causeId: z.union([z.uuid(), z.literal("")]) })).max(100) }),
  character: z.strictObject({ summary: text, characters: z.array(z.strictObject({ sourceId, ...characterFields })).max(30) }),
  storyboard: z.strictObject({ summary: text, shots: z.array(z.strictObject(shotFields)).max(100) }),
};
export const codexResultSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("script"), proposal: proposalSchemas.script }),
  z.strictObject({ kind: z.literal("structure"), proposal: proposalSchemas.structure }),
  z.strictObject({ kind: z.literal("character"), proposal: proposalSchemas.character }),
  z.strictObject({ kind: z.literal("storyboard"), proposal: proposalSchemas.storyboard }),
  z.strictObject({ kind: z.literal("image"), path: imagePath.min(1), mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]), revisedPrompt: text }),
]);
export const codexRunSchema = z.strictObject({ directory: z.string().min(1).max(4096), id: z.uuid(), action: z.enum(codexActions), model: z.string().max(200).optional(), prompt: z.string().max(12000), context: storySchema.nullable(), targetId: z.uuid().nullable(), references: z.array(z.string().min(1).max(4096)).max(4) }).refine(input => JSON.stringify(input.context).length < 500000, { message: "Seleccioná una historia de hasta 500.000 caracteres para esta operación." });
export type CodexRun = z.infer<typeof codexRunSchema>;
export const codexJobSchema = z.strictObject({
  id: z.uuid(), action: z.enum(codexActions), targetId: z.uuid().nullable(), model: z.string(), prompt: text, references: z.array(z.string()),
  context: storySchema.nullable(), status: z.enum(["queued", "running", "completed", "failed", "cancelled"]), stage: text,
  text: z.string().max(250000), result: codexResultSchema.nullable(), error: text, startedAt: z.number(), finishedAt: z.number().nullable(),
});
export type CodexJob = z.infer<typeof codexJobSchema>;
export type CodexStatus = { authType: string | null; plan: string | null; imageGeneration: boolean; models: { id: string; label: string; isDefault: boolean; reasoningEfforts: string[]; defaultReasoningEffort: string; inputModalities: string[] }[]; limits: { name: string; usedPercent: number; resetsAt: number | null }[]; hasCredits: boolean; activeJob: string | null };

export function applyCodexProposal(current: Story, job: CodexJob): Story {
  if (job.status !== "completed" || !job.result) throw new Error("El trabajo todavía no terminó correctamente.");
  if (current.appliedCodexRuns.includes(job.id)) throw new Error("Esta propuesta ya fue aplicada.");
  if (job.result.kind !== "image" && JSON.stringify(storySchema.parse(current)) !== JSON.stringify(job.context && storySchema.parse(job.context))) throw new Error("La historia cambió desde el pedido. Generá una propuesta con el contenido actual.");
  const next = structuredClone(current);
  const result = job.result;
  if (result.kind === "script") {
    next.title = result.proposal.title; next.logline = result.proposal.logline;
    for (const { sourceId, ...fields } of result.proposal.beats) {
      const existing = sourceId ? next.beats.find(beat => beat.id === sourceId) : undefined;
      if (sourceId && !existing) throw new Error("La propuesta refiere a un beat inexistente.");
      if (existing) Object.assign(existing, fields); else next.beats.push({ id: crypto.randomUUID(), ...fields });
    }
  } else if (result.kind === "structure") {
    for (const change of result.proposal.changes) {
      const beat = next.beats.find(beat => beat.id === change.beatId);
      if (!beat) throw new Error("La propuesta refiere a un beat inexistente.");
      beat.causeId = change.causeId;
    }
  } else if (result.kind === "character") {
    for (const { sourceId, ...fields } of result.proposal.characters) {
      const existing = sourceId ? next.characters.find(character => character.id === sourceId) : undefined;
      if (sourceId && !existing) throw new Error("La propuesta refiere a un personaje inexistente.");
      if (existing) Object.assign(existing, fields); else next.characters.push({ id: crypto.randomUUID(), portrait: "", ...fields });
    }
  } else if (result.kind === "storyboard") {
    next.shots.push(...result.proposal.shots.map(shot => ({ ...shot, id: crypto.randomUUID(), image: "" })));
  } else if (job.action === "portrait") {
    const character = next.characters.find(character => character.id === job.targetId);
    if (!character) throw new Error("El personaje de este retrato ya no existe.");
    character.portrait = result.path;
  } else if (job.action === "sketch") {
    const shot = next.shots.find(shot => shot.id === job.targetId);
    if (!shot) throw new Error("El plano de este boceto ya no existe.");
    shot.image = result.path;
  } else throw new Error("Esta imagen se puede usar desde el lienzo.");
  next.appliedCodexRuns.push(job.id);
  return storySchema.parse(next);
}
