<script setup lang="ts">
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getTool } from "../lib/tools";
import { useWorkspaceStore } from "../stores/workspace";
import ToolSidebar from "../components/workspace/ToolSidebar.vue";
import ToolWorkspacePanel from "../components/workspace/ToolWorkspacePanel.vue";
import WorkspaceInspector from "../components/workspace/WorkspaceInspector.vue";

const route = useRoute();
const router = useRouter();
const workspaceStore = useWorkspaceStore();

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
</script>

<template>
  <section class="workspace-view" :class="{ 'workspace-view--inspector-hidden': !workspaceStore.inspectorVisible }">
    <ToolSidebar />
    <ToolWorkspacePanel />
    <WorkspaceInspector v-if="workspaceStore.inspectorVisible" />
  </section>
</template>
