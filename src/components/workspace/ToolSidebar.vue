<script setup lang="ts">
import { nextTick, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ChevronDown, Star } from "lucide-vue-next";
import { useWorkspaceStore } from "../../stores/workspace";

const router = useRouter();
const workspaceStore = useWorkspaceStore();

const expandedCategories = reactive<Set<string>>(
  new Set(workspaceStore.filteredCategories.map((c) => c.id)),
);

const sidebarScroll = ref<HTMLElement | null>(null);

function goHome() {
  void router.push({ name: "home" });
}

function openTool(toolId: string) {
  workspaceStore.setActiveTool(toolId);
  void router.push({ name: "workspace", params: { toolId } });
}

function toggleCategory(categoryId: string) {
  if (expandedCategories.has(categoryId)) {
    expandedCategories.delete(categoryId);
  } else {
    expandedCategories.add(categoryId);
  }
}

function isExpanded(categoryId: string): boolean {
  return expandedCategories.has(categoryId);
}

function scrollActiveToolIntoView() {
  nextTick(() => {
    const activeEl = sidebarScroll.value?.querySelector(".tool-nav.active");
    activeEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

watch(() => workspaceStore.activeToolId, scrollActiveToolIntoView);
onMounted(scrollActiveToolIntoView);
</script>

<template>
  <aside class="sidebar shell-card">
    <div class="sidebar-header">
      <h2>工具导航</h2>
      <button class="ghost-button small" type="button" @click="goHome">首页</button>
    </div>

    <div ref="sidebarScroll" class="sidebar-scroll">
      <section
        v-for="category in workspaceStore.filteredCategories"
        :key="category.id"
        class="tool-group"
      >
        <button
          class="tool-group-title"
          type="button"
          :aria-expanded="isExpanded(category.id)"
          @click="toggleCategory(category.id)"
        >
          <strong>{{ category.name }}</strong>
          <span class="tool-group-meta">
            <span class="tool-group-count">{{ category.tools.length }}</span>
            <span class="tool-group-chevron" :class="{ collapsed: !isExpanded(category.id) }">
              <ChevronDown :size="14" />
            </span>
          </span>
        </button>

        <div v-show="isExpanded(category.id)" class="tool-group-items">
          <button
            v-for="tool in category.tools"
            :key="tool.id"
            class="tool-nav"
            :class="{ active: workspaceStore.activeTool.id === tool.id }"
            type="button"
            @click="openTool(tool.id)"
          >
            <span class="tool-nav-copy">
              <span class="tool-nav-top-row">
                <span class="tool-nav-title-row">
                  <strong>{{ tool.name }}</strong>
                  <span class="mini-badge">{{ tool.tags[0] }}</span>
                </span>
                <span class="tool-nav-actions">
                  <button
                    class="favorite-toggle"
                    type="button"
                    :aria-label="workspaceStore.favoriteToolIds.includes(tool.id) ? '取消收藏工具' : '收藏工具'"
                    @click.stop="workspaceStore.toggleFavorite(tool.id)"
                  >
                    <Star
                      :size="14"
                      :fill="workspaceStore.favoriteToolIds.includes(tool.id) ? '#fbbf24' : 'none'"
                      :color="workspaceStore.favoriteToolIds.includes(tool.id) ? '#fbbf24' : '#7f97ba'"
                    />
                  </button>
                </span>
              </span>
              <small>{{ tool.description }}</small>
            </span>
          </button>
        </div>
      </section>
    </div>
  </aside>
</template>
