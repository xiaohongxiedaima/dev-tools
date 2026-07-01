<script setup lang="ts">
import { computed } from "vue";
import { useWorkspaceStore } from "../../stores/workspace";
import DefaultToolWorkspacePanel from "./DefaultToolWorkspacePanel.vue";
import JsonToolWorkspacePanel from "./JsonToolWorkspacePanel.vue";
import RedisLuaToolWorkspacePanel from "./RedisLuaToolWorkspacePanel.vue";
import ToolActionBar from "./ToolActionBar.vue";

const workspaceStore = useWorkspaceStore();

const currentPanelComponent = computed(() => {
  switch (workspaceStore.activeTool.id) {
    case "json-formatter":
      return JsonToolWorkspacePanel;
    case "redis-lua-debug-console":
      return RedisLuaToolWorkspacePanel;
    default:
      return DefaultToolWorkspacePanel;
  }
});
</script>

<template>
  <section class="workspace-main">
    <header class="workspace-header compact shell-card">
      <div class="workspace-title-group">
        <div class="workspace-badge">
          <span>{{ workspaceStore.activeTool.categoryName }}</span>
          <strong>{{ workspaceStore.activeTool.name }}</strong>
        </div>
      </div>
      <ToolActionBar />
    </header>

    <component :is="currentPanelComponent" />
  </section>
</template>
