<script setup lang="ts">
import { computed } from "vue";
import { Moon, Sun } from "lucide-vue-next";
import { useWorkspaceStore } from "../../stores/workspace";
import { useThemeStore } from "../../stores/theme";

const workspaceStore = useWorkspaceStore();
const themeStore = useThemeStore();
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
    <button
      class="ghost-button small icon-only"
      type="button"
      :title="themeStore.isDark ? '切换到浅色' : '切换到深色'"
      @click="themeStore.toggle"
    >
      <Sun v-if="themeStore.isDark" :size="16" />
      <Moon v-else :size="16" />
    </button>
  </div>
</template>
