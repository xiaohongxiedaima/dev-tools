<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getTool } from "../lib/tools";
import { useWorkspaceStore } from "../stores/workspace";
import ToolSidebar from "../components/workspace/ToolSidebar.vue";
import ToolWorkspacePanel from "../components/workspace/ToolWorkspacePanel.vue";
import WorkspaceInspector from "../components/workspace/WorkspaceInspector.vue";

const route = useRoute();
const router = useRouter();
const workspaceStore = useWorkspaceStore();
const sidebarWidth = ref(280);
const inspectorWidth = ref(320);
let cleanupResizeListeners: (() => void) | null = null;

const workspaceLayoutStyle = computed(() => ({
  "--workspace-sidebar-width": `${sidebarWidth.value}px`,
  "--workspace-inspector-width": `${inspectorWidth.value}px`,
}));

function stopResize() {
  cleanupResizeListeners?.();
  cleanupResizeListeners = null;
}

function startResize(panel: "sidebar" | "inspector", event: MouseEvent) {
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = panel === "sidebar" ? sidebarWidth.value : inspectorWidth.value;
  const minWidth = panel === "sidebar" ? 240 : 280;
  const maxWidth = panel === "sidebar" ? 420 : 520;

  const handleMouseMove = (moveEvent: MouseEvent) => {
    const delta = moveEvent.clientX - startX;
    const nextWidth = panel === "sidebar" ? startWidth + delta : startWidth - delta;
    const boundedWidth = Math.min(Math.max(nextWidth, minWidth), maxWidth);

    if (panel === "sidebar") {
      sidebarWidth.value = boundedWidth;
      return;
    }

    inspectorWidth.value = boundedWidth;
  };

  const handleMouseUp = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    cleanupResizeListeners = null;
  };

  cleanupResizeListeners = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
}

watch(
  () => route.params.toolId,
  (toolId) => {
    if (typeof toolId === "string" && getTool(toolId)) {
      if (workspaceStore.activeToolId !== toolId) {
        workspaceStore.setActiveTool(toolId);
      }
      return;
    }

    if (!route.params.toolId) {
      return;
    }

    void router.replace({ name: "workspace", params: { toolId: workspaceStore.activeToolId } });
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopResize();
});
</script>

<template>
  <section
    class="workspace-view"
    :class="{ 'workspace-view--inspector-hidden': !workspaceStore.inspectorVisible }"
    :style="workspaceLayoutStyle"
  >
    <ToolSidebar />
    <div
      class="workspace-resize-handle workspace-resize-handle--sidebar"
      role="separator"
      aria-label="调整左侧工具导航宽度"
      @mousedown="startResize('sidebar', $event)"
    />
    <ToolWorkspacePanel />
    <div
      v-if="workspaceStore.inspectorVisible"
      class="workspace-resize-handle workspace-resize-handle--inspector"
      role="separator"
      aria-label="调整右侧历史中心宽度"
      @mousedown="startResize('inspector', $event)"
    />
    <WorkspaceInspector v-if="workspaceStore.inspectorVisible" />
  </section>
</template>
