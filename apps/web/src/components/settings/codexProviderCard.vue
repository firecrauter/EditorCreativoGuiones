<template>
  <el-card v-if="!multiTenantEnabled" class="codexProvider" shadow="never">
    <div class="providerHeading">
      <div>
        <strong>Codex CLI · ChatGPT</strong>
        <el-tag size="small" effect="plain" type="info">Local · Suscripción</el-tag>
        <p>{{ status ? 'Sesión de ChatGPT conectada' : 'Usá la sesión de ChatGPT de tu Codex CLI' }}</p>
      </div>
      <el-button :loading="loading" @click="refresh">{{ status ? 'Actualizar modelos' : 'Conectar Codex' }}</el-button>
    </div>
    <el-alert v-if="error" :title="error" type="warning" :closable="false" showIcon />
    <div v-if="status" class="modelList">
      <template v-if="scope === 'text'">
        <el-tag v-for="model in status.models" :key="model.id" effect="plain" :title="model.reasoningEfforts.join(', ')">{{ model.label }}</el-tag>
      </template>
      <el-tag v-else-if="status.imageGeneration" effect="plain">Imágenes de Codex · Generar y editar con referencias</el-tag>
      <el-text v-else type="warning">Esta sesión no declara generación de imágenes.</el-text>
    </div>
    <el-text size="small" type="info">Consume el cupo de tu suscripción. Sin claves API ni proveedores pagos alternativos.</el-text>
    <el-alert v-if="status?.hasCredits" title="La cuenta declara créditos adicionales. Codex comparte el cupo con tus otras sesiones; el editor bloquea pedidos si el cupo consultado está agotado." type="warning" :closable="false" />
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import axios from "axios";
import type { CodexStatus } from "@toonflow/story";
import { multiTenantEnabled, refreshModelChoices } from "@/stores/settings";
import { invalidateNodeModels } from "@toonflow/nodes-scaffold/nodeAi";

defineProps<{ scope: "text" | "media" }>();
const status = ref<CodexStatus>();
const loading = ref(false);
const error = ref("");
async function refresh() {
  if (loading.value || multiTenantEnabled.value) return;
  loading.value = true; error.value = "";
  try {
    const response = await axios.get<{ data: CodexStatus }>("/api/codex/status", { headers: { "x-toonflow-workspace": "1" } });
    status.value = response.data.data;
    invalidateNodeModels("language"); invalidateNodeModels("media");
    await refreshModelChoices(true);
  } catch (cause) { status.value = undefined; error.value = axios.isAxiosError(cause) ? cause.response?.data?.message || cause.message : "No se pudo conectar con Codex CLI."; }
  finally { loading.value = false; }
}
onMounted(refresh);
</script>

<style scoped lang="scss">
.codexProvider {
  margin-bottom: 16px;
  .providerHeading { display: flex; gap: 16px; justify-content: space-between; align-items: center;
    strong { margin-right: 12px; }
    p { margin: 8px 0; color: var(--el-text-color-secondary); font-size: 13px; }
  }
  .modelList { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
  .el-alert { margin-top: 12px; }
}
</style>
