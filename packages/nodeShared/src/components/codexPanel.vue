<template>
  <section class="codexPanel" aria-label="Asistente Codex con ChatGPT">
    <header class="codexHeader">
      <div><strong>Codex · ChatGPT</strong><p>{{ status ? 'Sesión de ChatGPT conectada' : 'Conectá tu sesión existente de Codex CLI' }}</p></div>
      <el-button :loading="connecting" :disabled="busy" @click="connect">{{ status ? 'Actualizar conexión' : 'Conectar Codex' }}</el-button>
    </header>
    <p class="usageNotice">Usa el cupo compartido de tu suscripción. Cada pedido de imagen genera una sola imagen; no se usan claves API ni proveedores alternativos.</p>
    <div v-if="status?.limits.length" class="quotaList"><span v-for="limit in status.limits" :key="limit.name">{{ limit.name }}: {{ limit.usedPercent }}% usado<span v-if="limit.resetsAt"> · reinicia {{ new Date(limit.resetsAt * 1000).toLocaleString('es-AR', { hour12: false }) }}</span></span></div>
    <p v-if="status?.hasCredits" class="usageNotice">Tu cuenta informa créditos disponibles. Codex puede usarlos cuando se agote el cupo incluido.</p>
    <p v-if="error" class="codexError" role="alert">{{ error }}</p>
    <div class="requestFields">
      <label>Acción<el-select v-model="action" aria-label="Acción de Codex" :disabled="busy"><el-option v-for="item in actions" :key="item" :label="actionLabels[item]" :value="item" /></el-select></label>
      <label>Modelo<el-select v-model="model" aria-label="Modelo de Codex" :disabled="busy || !status"><el-option v-for="item in status?.models ?? []" :key="item.id" :label="item.label" :value="item.id" /></el-select></label>
    </div>
    <label class="promptLabel">Instrucciones<el-input v-model="prompt" type="textarea" :rows="3" :maxlength="12000" aria-label="Instrucciones para Codex" placeholder="Qué querés desarrollar o cambiar, tono y restricciones…" :disabled="busy" /></label>
    <fieldset v-if="imageAction && references.length" class="referenceList" :disabled="busy"><legend>Referencias visuales</legend><label v-for="reference in references" :key="reference.path"><input v-model="selectedReferences" type="checkbox" :value="reference.path" :disabled="!selectedReferences.includes(reference.path) && selectedReferences.length >= 4" />{{ reference.label }}</label></fieldset>
    <p v-if="action === 'portrait' && !characterId" class="usageNotice">Seleccioná un personaje para generar su retrato.</p>
    <p v-if="action === 'sketch' && !shotId" class="usageNotice">Seleccioná un plano del storyboard para generar su boceto.</p>
    <div class="requestActions">
      <el-button type="primary" :disabled="!canRun" :loading="starting" @click="start">{{ imageAction ? 'Generar 1 imagen con Codex' : 'Solicitar propuesta' }}</el-button>
      <el-button v-if="busy" :loading="cancelling" @click="cancel">Cancelar trabajo</el-button>
      <span v-if="job" role="status">{{ job.stage }}</span>
    </div>
    <label v-if="history.length" class="historyPicker">Historial del proyecto<el-select :modelValue="job?.id" aria-label="Historial de Codex" :disabled="busy" @change="selectHistory"><el-option v-for="item in history" :key="item.id" :value="item.id" :label="`${actionLabels[item.action]} · ${new Date(item.startedAt).toLocaleString('es-AR', { hour12: false })} · ${statusLabel(item.status)}`" /></el-select></label>
    <p v-if="job?.error" class="codexError" role="alert">{{ job.error }}</p>
    <article v-if="job?.result" class="resultPreview" aria-label="Resultado de Codex">
      <template v-if="job.result.kind === 'image'">
        <img v-if="previewUrl" :src="previewUrl" alt="Imagen generada por Codex" />
        <p>{{ actionLabels[job.action] }} · {{ new Date(job.startedAt).toLocaleString('es-AR', { hour12: false }) }}</p>
        <details v-if="job.result.revisedPrompt"><summary>Prompt de la imagen</summary><p>{{ job.result.revisedPrompt }}</p></details>
      </template>
      <template v-else>
        <p class="resultSummary">{{ job.result.proposal.summary }}</p>
        <template v-if="job.result.kind === 'script'"><h3>{{ job.result.proposal.title }}</h3><p>{{ job.result.proposal.logline }}</p><section v-for="(beat, index) in job.result.proposal.beats" :key="index" class="proposalCard"><strong>{{ beat.title }} · {{ beat.duration }} s</strong><small>{{ beat.scene }}</small><p>{{ beat.script }}</p></section></template>
        <template v-else-if="job.result.kind === 'structure'"><section v-for="(note, index) in job.result.proposal.notes" :key="index" class="proposalCard"><strong>{{ beatName(note.beatId) }}</strong><p>{{ note.note }}</p></section><p v-for="change in job.result.proposal.changes" :key="change.beatId">{{ beatName(change.beatId) }} ← {{ change.causeId ? beatName(change.causeId) : 'Sin vínculo causal' }}</p></template>
        <template v-else-if="job.result.kind === 'character'"><section v-for="(character, index) in job.result.proposal.characters" :key="index" class="proposalCard"><h3>{{ character.name }}</h3><p>{{ character.role }}</p><p><strong>Deseo:</strong> {{ character.want }}</p><p><strong>Conflicto:</strong> {{ character.conflict }}</p><p><strong>Arco:</strong> {{ character.arc }}</p><p><strong>Relaciones:</strong> {{ character.relations }}</p><p>{{ character.notes }}</p></section></template>
        <template v-else-if="job.result.kind === 'storyboard'"><section v-for="(shot, index) in job.result.proposal.shots" :key="index" class="proposalCard"><strong>{{ index + 1 }}. {{ shot.title }} · {{ shot.duration }} s</strong><small>{{ beatName(shot.beatId) }} · {{ shot.framing }} · {{ shot.camera }}</small><p>{{ shot.description }}</p><details><summary>Prompt visual</summary><p>{{ shot.imagePrompt }}</p></details></section></template>
      </template>
      <div class="resultActions">
        <el-button v-if="canApply" type="primary" :disabled="appliedIds.includes(job.id)" @click="$emit('apply', job)">{{ appliedIds.includes(job.id) ? 'Aplicada' : job.result.kind === 'image' ? (canApplyImage ? 'Usar en este nodo' : job.action === 'portrait' ? 'Usar como retrato' : 'Usar en este plano') : 'Aplicar propuesta' }}</el-button>
        <el-button v-if="job.result.kind === 'image' && createImageNode" @click="$emit('addImage', job)">Crear nodo imagen</el-button>
      </div>
    </article>
    <pre v-else-if="job?.text" class="progressText">{{ job.text }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ElButton, ElInput, ElSelect, ElOption } from "element-plus";
import { actionLabels, codexJobSchema, type CodexJob, type CodexRun, type CodexStatus, type Story } from "@toonflow/story";

const props = withDefaults(defineProps<{
  directory: string; context?: Story | null; characterId?: string | null; shotId?: string | null;
  initialAction?: CodexRun["action"]; references?: { path: string; label: string }[]; appliedIds?: string[];
  readImage: (path: string) => Promise<ArrayBuffer>; beforeRun?: () => Promise<void>; canApplyImage?: boolean; createImageNode?: boolean;
}>(), { context: null, characterId: null, shotId: null, initialAction: "image", references: () => [], appliedIds: () => [], canApplyImage: false, createImageNode: false });
defineEmits<{ apply: [job: CodexJob]; addImage: [job: CodexJob] }>();
const status = ref<CodexStatus>();
const connecting = ref(false);
const starting = ref(false);
const cancelling = ref(false);
const error = ref("");
const model = ref("");
const action = ref(props.initialAction);
const prompt = ref("");
const selectedReferences = ref<string[]>([]);
const job = ref<CodexJob>();
const history = ref<CodexJob[]>([]);
const previewUrl = ref("");
const imageAction = computed(() => ["portrait", "sketch", "image"].includes(action.value));
const busy = computed(() => starting.value || !!job.value && ["queued", "running"].includes(job.value.status));
const actions = computed<CodexRun["action"][]>(() => props.context ? ["script", "structure", "character", "storyboard", "portrait", "sketch", "image"] : ["image"]);
const canRun = computed(() => !!status.value && !busy.value && !!model.value && (!imageAction.value || status.value.imageGeneration) && (action.value !== "portrait" || !!props.characterId) && (action.value !== "sketch" || !!props.shotId) && (action.value !== "image" || !!prompt.value.trim()));
const canApply = computed(() => job.value?.status === "completed" && job.value.result && (job.value.result.kind !== "image" ? !!props.context : props.canApplyImage || !!props.context && ["portrait", "sketch"].includes(job.value.action)));
const lifetime = new AbortController();
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let previewRevision = 0;

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/codex/${path}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", "x-toonflow-workspace": "1" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: lifetime.signal });
  const result = await response.json();
  if (!response.ok || result.code !== 200) throw new Error(result.message || "No se pudo comunicar con Codex.");
  return result.data as T;
}
function message(error: unknown) { return error instanceof Error ? error.message : "No se pudo completar la operación."; }
function statusLabel(value: CodexJob["status"]) { return ({ queued: "en espera", running: "en marcha", completed: "completado", failed: "falló", cancelled: "cancelado" })[value]; }
function beatName(id: string) { return job.value?.context?.beats.find(beat => beat.id === id)?.title || "Beat"; }
async function connect() {
  connecting.value = true; error.value = "";
  try { status.value = await request<CodexStatus>("status"); if (!status.value.models.some(item => item.id === model.value)) model.value = status.value.models.find(item => item.isDefault)?.id || status.value.models[0]?.id || ""; }
  catch (cause) { error.value = message(cause); status.value = undefined; }
  finally { connecting.value = false; }
}
async function loadHistory() {
  history.value = (await request<CodexJob[]>(`jobs?directory=${encodeURIComponent(props.directory)}`)).map(item => codexJobSchema.parse(item));
}
async function poll() {
  if (!job.value || lifetime.signal.aborted) return;
  try {
    job.value = codexJobSchema.parse(await request<CodexJob>(`job?directory=${encodeURIComponent(props.directory)}&id=${job.value.id}`));
    if (["queued", "running"].includes(job.value.status)) pollTimer = setTimeout(() => void poll(), 1500);
    else { await loadHistory(); void connect(); }
  } catch (cause) { if (!lifetime.signal.aborted) { error.value = `${message(cause)} Reintentando la lectura del trabajo…`; pollTimer = setTimeout(() => void poll(), 4000); } }
}
async function start() {
  starting.value = true; error.value = "";
  try {
    await props.beforeRun?.();
    const targetId = ["character", "portrait"].includes(action.value) ? props.characterId : action.value === "sketch" ? props.shotId : null;
    const input: CodexRun = { id: crypto.randomUUID(), directory: props.directory, model: model.value, action: action.value, prompt: prompt.value, context: props.context ? JSON.parse(JSON.stringify(props.context)) : null, targetId, references: imageAction.value ? [...selectedReferences.value] : [] };
    job.value = codexJobSchema.parse(await request<CodexJob>("run", input));
    await loadHistory(); void poll();
  } catch (cause) { error.value = message(cause); }
  finally { starting.value = false; }
}
async function cancel() {
  if (!job.value) return;
  cancelling.value = true;
  try { await request("cancel", { directory: props.directory, id: job.value.id }); }
  catch (cause) { error.value = message(cause); }
  finally { cancelling.value = false; }
}
function selectHistory(id: unknown) { job.value = history.value.find(item => item.id === id); if (busy.value) void poll(); }
watch(() => [action.value, props.shotId], () => {
  if (action.value === "sketch") {
    const ids = props.context?.shots.find(shot => shot.id === props.shotId)?.characterIds ?? [];
    selectedReferences.value = props.context?.characters.filter(character => ids.includes(character.id) && character.portrait).map(character => character.portrait).slice(0, 4) ?? [];
  } else selectedReferences.value = [];
}, { immediate: true });
watch(() => job.value?.result, async result => {
  const revision = ++previewRevision;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = "";
  if (result?.kind !== "image") return;
  try {
    const bytes = await props.readImage(result.path);
    if (revision === previewRevision && !lifetime.signal.aborted) previewUrl.value = URL.createObjectURL(new Blob([bytes], { type: result.mimeType }));
  } catch (cause) { if (!lifetime.signal.aborted) error.value = message(cause); }
});
onMounted(async () => {
  void connect();
  try { await loadHistory(); job.value = history.value.find(item => ["queued", "running"].includes(item.status)); if (job.value) void poll(); }
  catch (cause) { if (!lifetime.signal.aborted) error.value = message(cause); }
});
onBeforeUnmount(() => { lifetime.abort(); if (pollTimer) clearTimeout(pollTimer); if (previewUrl.value) URL.revokeObjectURL(previewUrl.value); previewRevision++; });
</script>

<style scoped lang="scss">
.codexPanel {
  display: flex; flex-direction: column; gap: 14px; max-height: 70vh; overflow-y: auto; padding-right: 6px; color: var(--el-text-color-primary); font: 14px/1.55 "Segoe UI", Arial, sans-serif;
  p { margin: 0; white-space: pre-wrap; }
  .codexHeader { display: flex; justify-content: space-between; align-items: center; gap: 16px; strong { font-size: 18px; } p { font-size: 12px; color: var(--el-text-color-secondary); } }
  .usageNotice, .quotaList { font-size: 12px; color: var(--el-text-color-secondary); }
  .quotaList { display: flex; flex-direction: column; gap: 4px; }
  .codexError { border: 1px solid var(--el-color-danger); border-radius: 6px; padding: 10px; color: var(--el-color-danger); }
  .requestFields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  label { display: flex; flex-direction: column; gap: 6px; }
  .referenceList { display: flex; gap: 12px; flex-wrap: wrap; padding: 10px; border: 1px solid var(--el-border-color); border-radius: 6px; label { flex-direction: row; align-items: center; } }
  .requestActions, .resultActions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .requestActions > span { font-size: 12px; color: var(--el-text-color-secondary); }
  .resultPreview { max-height: 55vh; overflow: auto; padding: 16px; border: 1px solid var(--el-border-color); border-radius: 8px; display: flex; flex-direction: column; gap: 14px; img { max-width: 100%; max-height: 430px; object-fit: contain; align-self: center; } }
  .proposalCard { background: var(--el-fill-color-light); border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 8px; h3 { margin: 0; } small { color: var(--el-text-color-secondary); } }
  .progressText { max-height: 220px; overflow: auto; white-space: pre-wrap; font: inherit; }
  @media (max-width: 650px) { .requestFields { grid-template-columns: 1fr; } }
}
</style>
