<script setup lang="ts">
import { computed } from "vue";
import { useWorkspaceStore } from "../../stores/workspace";

const workspaceStore = useWorkspaceStore();
const historyButtonLabel = computed(() => (workspaceStore.inspectorVisible ? "隐藏历史" : "显示历史"));

async function saveHistory() {
  try {
    await workspaceStore.saveCurrentHistoryEntry();
  } catch (error) {
    workspaceStore.errorMessage = error instanceof Error ? error.message : String(error);
  }
}

</script>

<template>
  <div class="workspace-toolbar">
    <button
      v-if="workspaceStore.activeToolId !== 'json-formatter' && workspaceStore.activeToolId !== 'redis-lua-debug-console'"
      class="ghost-button"
      type="button"
      @click="workspaceStore.swapInputAndOutputPreview()"
    >
      交换输入输出
    </button>
    <button class="ghost-button" type="button" @click="saveHistory">保存</button>
    <button class="ghost-button" type="button" @click="workspaceStore.toggleInspectorVisibility()">
      {{ historyButtonLabel }}
    </button>
  </div>
</template>
