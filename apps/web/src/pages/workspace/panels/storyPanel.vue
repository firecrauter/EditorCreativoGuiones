<template>
  <section class="storyEditor" aria-label="Historia y personajes" :inert="applying">
    <header class="storyHeader">
      <div class="storyIdentity">
        <label>Título<input v-model="story.title" aria-label="Título de la historia" :disabled="!ready" /></label>
        <label>Premisa<input v-model="story.logline" aria-label="Premisa" :disabled="!ready" /></label>
      </div>
      <div class="storyActions">
        <el-radio-group v-model="view" aria-label="Vista narrativa">
          <el-radio-button value="structure">Estructura</el-radio-button>
          <el-radio-button value="characters">Personajes</el-radio-button>
          <el-radio-button value="storyboard">Storyboard</el-radio-button>
        </el-radio-group>
        <el-button :disabled="!ready || saving" @click="exportScript">Exportar guion</el-button>
        <el-button :disabled="!ready" @click="openCodex()">Codex · ChatGPT</el-button>
        <el-button type="primary" :disabled="!ready || !dirty" :loading="saving" @click="saveFromButton">Guardar</el-button>
      </div>
    </header>
    <p v-if="failure" class="storyError" role="alert">{{ failure }}</p>
    <p v-if="!ready && !failure" role="status">Abriendo la historia…</p>
    <template v-if="ready">
      <div v-if="view === 'structure'" class="structureView">
        <aside class="scriptColumn" aria-label="Guion por beats">
          <div class="columnHeading"><h2>Guion</h2><el-button size="small" @click="addBeat">Añadir beat</el-button></div>
          <button v-for="(beat, index) in story.beats" :key="beat.id" class="scriptBeat" :class="{ selected: selectedBeatId === beat.id }" @click="selectedBeatId = beat.id">
            <span class="beatNumber">{{ String(index + 1).padStart(2, '0') }} · {{ beat.scene || 'Escena sin título' }}</span>
            <strong>{{ beat.title || 'Beat sin título' }}</strong><p>{{ beat.script }}</p>
          </button>
        </aside>
        <section class="beatColumn" aria-label="Mapa de beats">
          <div class="columnHeading"><h2>Estructura</h2><span>{{ story.beats.length }} beats · {{ totalDuration }} s</span></div>
          <div class="beatMap">
            <button v-for="(beat, index) in story.beats" :key="beat.id" class="beatCard" :class="{ selected: selectedBeatId === beat.id }" :style="{ '--beatColor': beat.color }" @click="selectedBeatId = beat.id">
              <span class="beatNumber">BEAT {{ index + 1 }} <span>{{ beat.duration }} s</span></span>
              <strong>{{ beat.title || 'Beat sin título' }}</strong><p>{{ beat.script }}</p>
              <small v-if="beat.causeId">← {{ story.beats.find(item => item.id === beat.causeId)?.title || 'Beat anterior' }}</small>
              <div class="castTags"><span v-for="id in beat.characterIds" :key="id">{{ story.characters.find(character => character.id === id)?.name }}</span></div>
            </button>
          </div>
          <div class="rhythmStrip" aria-label="Ritmo y duración">
            <button v-for="(beat, index) in story.beats" :key="beat.id" :style="{ flexGrow: beat.duration, backgroundColor: beat.color }" :class="{ selected: selectedBeatId === beat.id }" :title="`${beat.title || 'Beat ' + (index + 1)} · ${beat.duration} s`" @click="selectedBeatId = beat.id">{{ index + 1 }}</button>
          </div>
        </section>
        <aside class="inspectorColumn" aria-label="Inspector de beat">
          <template v-if="selectedBeat">
            <div class="columnHeading"><h2>Beat</h2><span>{{ story.beats.indexOf(selectedBeat) + 1 }}</span></div>
            <label>Título<input v-model="selectedBeat.title" aria-label="Título del beat" /></label>
            <label>Escena<input v-model="selectedBeat.scene" aria-label="Escena del beat" /></label>
            <label>Acción y diálogo<textarea v-model="selectedBeat.script" rows="8" aria-label="Acción y diálogo" /></label>
            <label>Duración en segundos<el-input-number v-model="selectedBeat.duration" :min="1" :max="3600" aria-label="Duración del beat" /></label>
            <label>Color<input v-model="selectedBeat.color" type="color" aria-label="Color del beat" /></label>
            <label>Provocado por<select v-model="selectedBeat.causeId" aria-label="Causa del beat"><option value="">Sin vínculo causal</option><option v-for="beat in story.beats.filter(item => item.id !== selectedBeat?.id)" :key="beat.id" :value="beat.id">{{ beat.title || 'Beat sin título' }}</option></select></label>
            <label>Personajes<el-select v-model="selectedBeat.characterIds" multiple aria-label="Personajes del beat"><el-option v-for="character in story.characters" :key="character.id" :label="character.name || 'Personaje sin nombre'" :value="character.id" /></el-select></label>
            <div class="inspectorActions"><el-button size="small" :disabled="story.beats[0] === selectedBeat" @click="moveBeat(-1)">Subir</el-button><el-button size="small" :disabled="story.beats.at(-1) === selectedBeat" @click="moveBeat(1)">Bajar</el-button><el-button size="small" type="danger" text @click="removeBeat">Eliminar beat</el-button></div>
          </template>
        </aside>
      </div>
      <div v-else-if="view === 'characters'" class="charactersView">
        <section class="charactersColumn" aria-label="Reparto">
          <div class="columnHeading"><h2>Personajes</h2><el-button @click="addCharacter">Añadir personaje</el-button></div>
          <div class="characterGrid">
            <button v-for="character in story.characters" :key="character.id" class="characterCard" :class="{ selected: selectedCharacterId === character.id }" @click="selectedCharacterId = character.id">
              <img v-if="portraitUrls[character.portrait]" :src="portraitUrls[character.portrait]" :alt="character.name" />
              <span v-else class="portraitInitial">{{ character.name.trim().slice(0, 1).toUpperCase() || '·' }}</span>
              <strong>{{ character.name || 'Personaje sin nombre' }}</strong><span>{{ character.role }}</span>
            </button>
          </div>
        </section>
        <aside class="characterInspector" aria-label="Ficha del personaje">
          <template v-if="selectedCharacter">
            <div class="columnHeading"><h2>Ficha</h2><el-button text type="danger" @click="removeCharacter">Eliminar personaje</el-button></div>
            <label>Nombre<input v-model="selectedCharacter.name" aria-label="Nombre del personaje" /></label>
            <label>Rol<input v-model="selectedCharacter.role" aria-label="Rol del personaje" /></label>
            <label>Retrato<input type="file" accept="image/png,image/jpeg,image/webp" :disabled="uploading" aria-label="Retrato del personaje" @change="uploadPortrait" /></label>
            <el-button @click="openCodex('portrait')">Generar retrato con Codex</el-button>
            <label>Qué quiere<textarea v-model="selectedCharacter.want" rows="3" aria-label="Deseo del personaje" /></label>
            <label>Conflicto<textarea v-model="selectedCharacter.conflict" rows="3" aria-label="Conflicto del personaje" /></label>
            <label>Arco<textarea v-model="selectedCharacter.arc" rows="3" aria-label="Arco del personaje" /></label>
            <label>Relaciones<textarea v-model="selectedCharacter.relations" rows="3" aria-label="Relaciones del personaje" /></label>
            <label>Notas<textarea v-model="selectedCharacter.notes" rows="3" aria-label="Notas del personaje" /></label>
          </template>
        </aside>
      </div>
      <div v-else class="charactersView">
        <section class="charactersColumn" aria-label="Planos del storyboard">
          <div class="columnHeading"><h2>Storyboard</h2><el-button @click="addShot">Añadir plano</el-button></div>
          <p v-if="!story.shots.length">Añadí un plano o pedile a Codex que desglose el guion.</p>
          <div class="shotGrid"><button v-for="(shot, index) in story.shots" :key="shot.id" class="shotCard" :class="{ selected: selectedShotId === shot.id }" @click="selectedShotId = shot.id"><img v-if="portraitUrls[shot.image]" :src="portraitUrls[shot.image]" :alt="shot.title" /><span v-else class="emptyFrame">{{ index + 1 }}</span><strong>{{ index + 1 }}. {{ shot.title || 'Plano sin título' }}</strong><small>{{ shot.framing }} · {{ shot.duration }} s</small><p>{{ shot.description }}</p></button></div>
        </section>
        <aside class="characterInspector" aria-label="Ficha del plano">
          <template v-if="selectedShot">
            <div class="columnHeading"><h2>Plano</h2><el-button text type="danger" @click="removeShot">Eliminar plano</el-button></div>
            <label>Título<input v-model="selectedShot.title" aria-label="Título del plano" /></label>
            <label>Beat<select v-model="selectedShot.beatId" aria-label="Beat del plano"><option v-for="beat in story.beats" :key="beat.id" :value="beat.id">{{ beat.title }}</option></select></label>
            <label>Acción<textarea v-model="selectedShot.description" rows="3" aria-label="Acción del plano" /></label>
            <label>Encuadre<input v-model="selectedShot.framing" aria-label="Encuadre del plano" /></label>
            <label>Cámara<input v-model="selectedShot.camera" aria-label="Cámara del plano" /></label>
            <label>Duración<el-input-number v-model="selectedShot.duration" :min="1" :max="3600" aria-label="Duración del plano" /></label>
            <label>Prompt visual<textarea v-model="selectedShot.imagePrompt" rows="4" aria-label="Prompt visual del plano" /></label>
            <label>Personajes<el-select v-model="selectedShot.characterIds" multiple aria-label="Personajes del plano"><el-option v-for="character in story.characters" :key="character.id" :label="character.name" :value="character.id" /></el-select></label>
            <el-button @click="openCodex('sketch')">Generar boceto con Codex</el-button>
            <el-button v-if="selectedShot.image" @click="$emit('addImage', { path: selectedShot.image, label: selectedShot.title, id: selectedShot.id, directory })">Crear nodo imagen</el-button>
          </template>
        </aside>
      </div>
      <footer class="storyStatus" role="status"><span>{{ saving ? 'Guardando…' : dirty ? 'Cambios sin guardar' : 'Guardado' }}</span><span>{{ story.beats.length }} beats · {{ story.characters.length }} personajes · {{ story.shots.length }} planos</span></footer>
    </template>
    <el-dialog v-model="codexVisible" title="Asistente Codex · ChatGPT" width="min(960px, 96vw)" appendToBody destroyOnClose>
      <codexPanel v-if="codexVisible" :directory="directory" :context="story" :characterId="selectedCharacterId || null" :shotId="selectedShotId || null" :initialAction="codexAction" :references="codexReferences" :appliedIds="story.appliedCodexRuns" :readImage="files.read" :beforeRun="flushSave" createImageNode @apply="applyJob" @addImage="addGeneratedImage" />
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { storySchema, parseStory, emptyStory, applyCodexProposal, type CodexJob, type CodexRun } from "@toonflow/story";
import codexPanel from "@toonflow/node-shared/codexPanel";
import useWorkspaceFiles, { type TextSnapshot } from "@/lib/workspaceFiles";

const props = defineProps<{ directory: string; referenceImages?: { path: string; label: string }[] }>();
const emit = defineEmits<{ addImage: [image: { path: string; label: string; id: string; directory: string }] }>();
const files = useWorkspaceFiles(props.directory);
const story = reactive(emptyStory());
const codexVisible = ref(false);
const codexAction = ref<CodexRun["action"]>("structure");
const applying = ref(false);
const selectedShotId = ref("");
const selectedShot = computed(() => story.shots.find(shot => shot.id === selectedShotId.value));
const codexReferences = computed(() => [...new Map([
  ...story.characters.filter(character => character.portrait).map(character => ({ path: character.portrait, label: `Retrato de ${character.name}` })),
  ...story.shots.filter(shot => shot.image).map(shot => ({ path: shot.image, label: `Boceto: ${shot.title}` })),
  ...(props.referenceImages ?? []),
].map(image => [image.path, image])).values()]);
function openCodex(action?: CodexRun["action"]) {
  codexAction.value = action || (view.value === "characters" ? "character" : view.value === "storyboard" ? selectedShot.value ? "sketch" : "storyboard" : "structure");
  codexVisible.value = true;
}
const ready = ref(false);
const saving = ref(false);
const uploading = ref(false);
const failure = ref("");
const view = ref("structure");
const selectedBeatId = ref("");
const selectedCharacterId = ref("");
const selectedBeat = computed(() => story.beats.find(beat => beat.id === selectedBeatId.value));
const selectedCharacter = computed(() => story.characters.find(character => character.id === selectedCharacterId.value));
const totalDuration = computed(() => story.beats.reduce((total, beat) => total + beat.duration, 0));
const portraitUrls = reactive<Record<string, string>>({});
const portraitReferences = new Map<string, ReturnType<typeof files.acquireUrl>>();
const fileName = "story.json";
const serialize = () => JSON.stringify(story, null, 2) + "\n";
let snapshot: TextSnapshot | undefined;
const savedText = ref(serialize());
const dirty = computed(() => ready.value && serialize() !== savedText.value);
let saveTask: Promise<void> | undefined;

onMounted(async () => {
  try {
    try {
      snapshot = await files.readTextSnapshot(fileName, { maxBytes: 20 * 1024 * 1024 });
      Object.assign(story, parseStory(JSON.parse(snapshot.text)));
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error;
    }
    savedText.value = serialize();
    selectedBeatId.value = story.beats[0]?.id ?? "";
    selectedCharacterId.value = story.characters[0]?.id ?? "";
    selectedShotId.value = story.shots[0]?.id ?? "";
    ready.value = true;
  } catch (error) { failure.value = "No se pudo abrir story.json. El archivo se conserva sin cambios. " + errorMessage(error); }
});

function errorMessage(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.data?.message || error.message : error instanceof Error ? error.message : String(error);
}

async function flushSave(): Promise<void> {
  if (saveTask) await saveTask;
  if (!dirty.value) return;
  if (uploading.value) throw new Error("Esperá a que termine de cargarse el retrato.");
  const text = serialize();
  storySchema.parse(JSON.parse(text));
  saving.value = true;
  failure.value = "";
  saveTask = (async () => {
    try {
      if (snapshot) snapshot = { text, encoding: snapshot.encoding, revision: await files.writeTextSnapshot(fileName, text, snapshot) };
      else {
        await files.write(fileName, text, true);
        const created = await files.readTextSnapshot(fileName);
        if (created.text !== text) throw new Error("Otro editor modificó la historia mientras se estaba creando. Los cambios actuales siguen en pantalla.");
        snapshot = created;
      }
      savedText.value = text;
    } catch (error) { failure.value = "No se guardaron los cambios. " + errorMessage(error); throw error; }
    finally { saving.value = false; }
  })();
  try { await saveTask; } finally { saveTask = undefined; }
  if (dirty.value) await flushSave();
}

function saveFromButton() { void flushSave().catch(() => {}); }
function addBeat() {
  const beat = { id: crypto.randomUUID(), title: "", scene: "", script: "", duration: 5, color: "#426d9b", causeId: "", characterIds: [] };
  story.beats.push(beat); selectedBeatId.value = beat.id;
}
function addCharacter() {
  const character = { id: crypto.randomUUID(), name: "", role: "", want: "", conflict: "", arc: "", relations: "", notes: "", portrait: "" };
  story.characters.push(character); selectedCharacterId.value = character.id;
}
function moveBeat(direction: number) {
  const index = story.beats.findIndex(beat => beat.id === selectedBeatId.value);
  if (index < 0 || index + direction < 0 || index + direction >= story.beats.length) return;
  const [beat] = story.beats.splice(index, 1); story.beats.splice(index + direction, 0, beat!);
}
async function removeBeat() {
  const id = selectedBeatId.value;
  const relatedShots = story.shots.filter(shot => shot.beatId === id).length;
  if (!await ElMessageBox.confirm(`Se eliminará este beat del guion y de la estructura.${relatedShots ? ` También se quitarán sus ${relatedShots} planos asociados; sus imágenes se conservarán.` : ""}`, "Eliminar beat", { type: "warning", confirmButtonText: "Eliminar", cancelButtonText: "Cancelar" }).then(() => true, () => false)) return;
  story.beats = story.beats.filter(beat => beat.id !== id);
  for (const beat of story.beats) if (beat.causeId === id) beat.causeId = "";
  story.shots = story.shots.filter(shot => shot.beatId !== id);
  selectedShotId.value = story.shots[0]?.id ?? "";
  selectedBeatId.value = story.beats[0]?.id ?? "";
}
async function removeCharacter() {
  const id = selectedCharacterId.value;
  if (!await ElMessageBox.confirm("Se quitará el personaje de la historia y de sus beats y planos. Sus imágenes se conservarán.", "Eliminar personaje", { type: "warning", confirmButtonText: "Eliminar", cancelButtonText: "Cancelar" }).then(() => true, () => false)) return;
  story.characters = story.characters.filter(character => character.id !== id);
  for (const beat of story.beats) beat.characterIds = beat.characterIds.filter(characterId => characterId !== id);
  for (const shot of story.shots) shot.characterIds = shot.characterIds.filter(characterId => characterId !== id);
  selectedCharacterId.value = story.characters[0]?.id ?? "";
}
async function uploadPortrait(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0]; const character = selectedCharacter.value;
  if (!file || !character) return;
  const extension = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as Record<string, string>)[file.type];
  if (!extension || file.size > 5 * 1024 * 1024) { ElMessage.error("Elegí un PNG, JPG o WebP de hasta 5 MB."); input.value = ""; return; }
  uploading.value = true;
  try {
    const image = await createImageBitmap(file); image.close();
    if (!(await files.list()).entries.some(entry => entry.name === "assets")) await files.mkdir("assets");
    if (!(await files.list("assets")).entries.some(entry => entry.name === "characters")) await files.mkdir("assets/characters");
    const path = `assets/characters/${crypto.randomUUID()}.${extension}`;
    await files.write(path, file, true); character.portrait = path;
  } catch (error) { ElMessage.error(errorMessage(error)); }
  finally { uploading.value = false; input.value = ""; }
}
watch(() => [...story.characters.map(character => character.portrait), ...story.shots.map(shot => shot.image)].filter(Boolean), paths => {
  for (const [path, reference] of portraitReferences) if (!paths.includes(path)) { reference.release(); portraitReferences.delete(path); delete portraitUrls[path]; }
  for (const path of paths) if (!portraitReferences.has(path)) {
    const reference = files.acquireUrl(path); portraitReferences.set(path, reference);
    void reference.url.then(url => { if (portraitReferences.get(path) === reference) portraitUrls[path] = url; }, () => { ElMessage.warning("No se pudo cargar un retrato."); });
  }
}, { immediate: true });
async function exportScript() {
  try {
    await flushSave();
    const text = [`# ${story.title || "Guion"}`, story.logline, "## Personajes", ...story.characters.map(character => `### ${character.name}\n${character.role}\n\nDeseo: ${character.want}\n\nConflicto: ${character.conflict}\n\nArco: ${character.arc}\n\nRelaciones: ${character.relations}\n\n${character.notes}`), "## Guion", ...story.beats.map((beat, index) => `### ${index + 1}. ${beat.title}\n${beat.scene} · ${beat.duration} s\n\n${beat.script}`)].join("\n\n");
    const storyboard = story.shots.length ? "\n\n## Storyboard\n\n" + story.shots.map((shot, index) => `### ${index + 1}. ${shot.title}\n${shot.framing} · ${shot.camera} · ${shot.duration} s\n\n${shot.description}\n\n${shot.image ? `![${shot.title}](${shot.image})\n\n` : ""}Prompt visual: ${shot.imagePrompt}`).join("\n\n") : "";
    const path = `guion${Date.now()}.md`; await files.write(path, text + storyboard, true); ElMessage.success(`Guion exportado en ${path}`);
  } catch (error) { ElMessage.error(errorMessage(error)); }
}
function addShot() {
  if (!story.beats.length) { ElMessage.warning("Añadí un beat antes de crear un plano."); return; }
  const shot = { id: crypto.randomUUID(), beatId: selectedBeatId.value || story.beats[0]!.id, title: "", description: "", framing: "", camera: "", duration: 5, imagePrompt: "", characterIds: [] as string[], image: "" };
  story.shots.push(shot); selectedShotId.value = shot.id;
}
async function removeShot() {
  const id = selectedShotId.value;
  if (!await ElMessageBox.confirm("Se quitará este plano del storyboard. Su imagen se conservará.", "Eliminar plano", { confirmButtonText: "Eliminar", cancelButtonText: "Cancelar" }).then(() => true, () => false)) return;
  story.shots = story.shots.filter(shot => shot.id !== id); selectedShotId.value = story.shots[0]?.id ?? "";
}
async function applyJob(job: CodexJob) {
  if (applying.value) return;
  const before = JSON.parse(JSON.stringify(story));
  applying.value = true;
  try {
    Object.assign(story, applyCodexProposal(before, job));
    await flushSave();
    selectedCharacterId.value ||= story.characters[0]?.id ?? "";
    selectedShotId.value ||= story.shots[0]?.id ?? "";
    ElMessage.success("Propuesta aplicada y guardada.");
  } catch (error) { Object.assign(story, before); ElMessage.error(errorMessage(error)); }
  finally { applying.value = false; }
}
function addGeneratedImage(job: CodexJob) {
  if (job.result?.kind === "image") emit("addImage", { path: job.result.path, label: `${story.title || 'Imagen'} · ${job.action === 'portrait' ? 'Retrato' : 'Boceto'}`, id: job.id, directory: props.directory });
}
function preventUnload(event: BeforeUnloadEvent) { if (dirty.value || saving.value || uploading.value) { event.preventDefault(); event.returnValue = ""; } }
window.addEventListener("beforeunload", preventUnload);
onBeforeUnmount(() => { window.removeEventListener("beforeunload", preventUnload); for (const reference of portraitReferences.values()) reference.release(); });
defineExpose({ flushSave, ready, dirty });
</script>

<style scoped lang="scss">
.storyEditor {
  display: flex; flex-direction: column; height: calc(100vh - 96px); min-height: 400px; color: var(--el-text-color-primary);
  input, textarea, select { box-sizing: border-box; width: 100%; border: 1px solid var(--el-border-color); border-radius: 6px; padding: 9px 10px; background: var(--el-fill-color-blank); color: inherit; font: inherit; }
  textarea { resize: vertical; line-height: 1.6; }
  label { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; color: var(--el-text-color-secondary); font-size: 12px; }
  button { cursor: pointer; }
  button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
  .storyHeader { display: flex; gap: 24px; align-items: flex-start; padding-bottom: 16px; border-bottom: 1px solid var(--el-border-color); }
  .storyIdentity { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(240px, 2fr); gap: 16px; flex: 1; label { margin: 0; } }
  .storyActions { display: flex; gap: 8px; align-items: flex-end; padding-top: 20px; }
  .storyActions { flex-wrap: wrap; }
  .storyError { padding: 12px; color: var(--el-color-danger); border: 1px solid currentColor; border-radius: 6px; }
  .structureView { display: grid; grid-template-columns: minmax(220px, 0.85fr) minmax(320px, 1.4fr) minmax(260px, 0.8fr); flex: 1; min-height: 0; }
  .columnHeading { display: flex; gap: 12px; justify-content: space-between; align-items: center; margin-bottom: 18px; h2 { font-size: 16px; margin: 0; } span { font-size: 12px; color: var(--el-text-color-secondary); } }
  .scriptColumn, .beatColumn, .inspectorColumn, .charactersColumn, .characterInspector { padding: 22px 18px; overflow-y: auto; min-width: 0; }
  .scriptColumn, .beatColumn, .charactersColumn { border-right: 1px solid var(--el-border-color); }
  .scriptBeat { display: block; width: 100%; text-align: start; padding: 14px; margin-bottom: 8px; border: 1px solid transparent; border-radius: 8px; color: inherit; background: transparent; strong { display: block; margin-top: 8px; } p { white-space: pre-wrap; line-height: 1.7; font-size: 13px; } }
  .selected { outline: 2px solid var(--el-color-primary); outline-offset: -2px; background: var(--el-color-primary-light-9); }
  .beatNumber { font-size: 11px; color: var(--el-text-color-secondary); display: flex; justify-content: space-between; }
  .beatMap { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
  .beatCard { min-height: 140px; border: 1px solid var(--el-border-color); border-top: 4px solid var(--beatColor); border-radius: 8px; padding: 14px; background: var(--el-bg-color-overlay); color: inherit; text-align: start; strong { display: block; margin: 14px 0; } p { white-space: pre-wrap; font-size: 12px; line-height: 1.6; max-height: 110px; overflow: hidden; } small { color: var(--el-text-color-secondary); } }
  .castTags { display: flex; gap: 4px; flex-wrap: wrap; span { background: var(--el-fill-color); padding: 3px 6px; border-radius: 4px; font-size: 10px; } }
  .rhythmStrip { display: flex; gap: 3px; margin-top: 28px; padding: 8px 0; button { min-width: 26px; min-height: 44px; flex-basis: 0; border: none; border-radius: 4px; color: #fff; } }
  .inspectorActions { display: flex; flex-wrap: wrap; gap: 6px; }
  .charactersView { display: grid; grid-template-columns: minmax(300px, 1fr) minmax(300px, 380px); flex: 1; min-height: 0; }
  .characterGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
  .shotGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
  .shotCard { display: flex; flex-direction: column; gap: 10px; padding: 12px; border: 1px solid var(--el-border-color); border-radius: 8px; background: var(--el-bg-color-overlay); color: inherit; text-align: start; img, .emptyFrame { width: 100%; aspect-ratio: 16/9; object-fit: contain; border-radius: 5px; background: #202a34; } .emptyFrame { display: grid; place-items: center; color: #9db8d4; font-size: 32px; } small { color: var(--el-text-color-secondary); } p { margin: 0; line-height: 1.6; } }
  .characterCard { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 22px 14px; border: 1px solid var(--el-border-color); border-radius: 12px; background: var(--el-bg-color-overlay); color: inherit; img, .portraitInitial { width: 112px; height: 112px; border-radius: 50%; object-fit: cover; } .portraitInitial { display: grid; place-items: center; background: #29486a; color: #dbeaff; font-size: 42px; } > span:last-child { color: var(--el-text-color-secondary); font-size: 12px; } }
  .storyStatus { display: flex; justify-content: space-between; padding: 12px 4px 0; border-top: 1px solid var(--el-border-color); font-size: 11px; color: var(--el-text-color-secondary); }
  @media (max-width: 1100px) { .storyHeader { flex-direction: column; gap: 8px; } .storyIdentity { width: 100%; } .storyActions { padding-top: 0; flex-wrap: wrap; } .structureView { grid-template-columns: 1fr 1fr; overflow: auto; } .scriptColumn { display: none; } }
  @media (max-width: 700px) { .structureView, .charactersView { grid-template-columns: 1fr; overflow: auto; } .storyIdentity { grid-template-columns: 1fr; } .scriptColumn, .beatColumn, .inspectorColumn, .charactersColumn, .characterInspector { overflow: visible; } }
}
</style>
