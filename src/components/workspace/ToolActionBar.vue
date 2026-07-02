<script setup lang="ts">
import { Square, PanelLeft, Columns3, PanelRight } from "lucide-vue-next";
import { useWorkspaceStore } from "../../stores/workspace";

const workspaceStore = useWorkspaceStore();

async function saveHistory() {
  try {
    await workspaceStore.saveCurrentHistoryEntry();
  } catch (error) {
    workspaceStore.errorMessage = error instanceof Error ? error.message : String(error);
  }
}

const layoutOptions = [
  { layout: "center" as const, icon: Square, label: "仅中部" },
  { layout: "left-center" as const, icon: PanelLeft, label: "左 + 中" },
  { layout: "all" as const, icon: Columns3, label: "左 + 中 + 右" },
  { layout: "center-right" as const, icon: PanelRight, label: "中 + 右" },
];
</script>

<template>
  <div class="workspace-toolbar">
    <div class="workspace-toolbar-left">
      <button
        v-if="workspaceStore.activeToolId !== 'json-formatter' && workspaceStore.activeToolId !== 'redis-lua-debug-console'"
        class="ghost-button"
        type="button"
        @click="workspaceStore.swapInputAndOutputPreview()"
      >
        交换输入输出
      </button>
      <button class="ghost-button" type="button" @click="saveHistory">保存</button>
    </div>

    <div class="workspace-toolbar-right">
      <div class="layout-toggle-group">
        <button
          v-for="option in layoutOptions"
          :key="option.layout"
          class="ghost-button small icon-only layout-toggle-btn"
          :class="{ 'layout-toggle-btn--active': workspaceStore.workspaceLayout === option.layout }"
          type="button"
          :title="option.label"
          :aria-pressed="workspaceStore.workspaceLayout === option.layout"
          @click="workspaceStore.setWorkspaceLayout(option.layout)"
        >
          <component :is="option.icon" :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workspace-toolbar-left,
.workspace-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.layout-toggle-group {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.layout-toggle-btn {
  border-radius: 0;
  border: none;
  width: 30px;
  min-width: 30px;
  height: 28px;
  padding: 0;
  display: inline-grid;
  place-items: center;
}

.layout-toggle-btn:not(:last-child) {
  border-right: 1px solid var(--color-border);
}

.layout-toggle-btn--active {
  background: var(--dt-primary, var(--color-primary, #7c3aed));
  color: white;
  border-color: transparent;
}
</style>
