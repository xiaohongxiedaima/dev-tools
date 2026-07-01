<script setup lang="ts">
import { useRouter } from "vue-router";
import { useWorkspaceStore } from "../../stores/workspace";

const router = useRouter();
const workspaceStore = useWorkspaceStore();

function goHome() {
  void router.push({ name: "home" });
}

function openTool(toolId: string) {
  workspaceStore.setActiveTool(toolId);
  void router.push({ name: "workspace", params: { toolId } });
}
</script>

<template>
  <aside class="sidebar shell-card">
    <div class="sidebar-header">
      <div>
        <h2>工具导航</h2>
        <p>{{ workspaceStore.filteredCategories.length }} 个分类</p>
      </div>
      <button class="ghost-button small" type="button" @click="goHome">首页</button>
    </div>

    <div class="sidebar-scroll">
      <section v-for="category in workspaceStore.filteredCategories" :key="category.id" class="tool-group">
        <div class="tool-group-title">
          <strong>{{ category.name }}</strong>
          <span>{{ category.tools.length }}</span>
        </div>

        <button
          v-for="tool in category.tools"
          :key="tool.id"
          class="tool-nav"
          :class="{ active: workspaceStore.activeTool.id === tool.id }"
          type="button"
          @click="openTool(tool.id)"
        >
          <span>
            <strong>{{ tool.name }}</strong>
            <small>{{ tool.description }}</small>
          </span>
          <span class="tool-nav-actions">
            <span class="mini-badge">{{ tool.tags[0] }}</span>
            <button
              class="favorite-toggle"
              type="button"
              :aria-label="workspaceStore.favoriteToolIds.includes(tool.id) ? '取消收藏工具' : '收藏工具'"
              @click.stop="workspaceStore.toggleFavorite(tool.id)"
            >
              {{ workspaceStore.favoriteToolIds.includes(tool.id) ? "★" : "☆" }}
            </button>
          </span>
        </button>
      </section>
    </div>
  </aside>
</template>
