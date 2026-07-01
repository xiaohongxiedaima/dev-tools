<script setup lang="ts">
import { useRouter } from "vue-router";
import { DATABASE_URL } from "../lib/database";
import { useWorkspaceStore } from "../stores/workspace";

const router = useRouter();
const workspaceStore = useWorkspaceStore();

function openTool(toolId: string) {
  workspaceStore.setActiveTool(toolId);
  void router.push({ name: "workspace", params: { toolId } });
}
</script>

<template>
  <section class="home-view">
    <section class="hero shell-card">
      <div class="hero-copy">
        <p class="eyebrow">Layout B + light homepage</p>
        <h1>先看首页，再快速进入工具工作台。</h1>
        <p class="summary">
          首页只做轻量入口：搜索、常用工具、最近使用和运行状态；真正的高频操作放在左侧工具树 +
          中央输入输出 + 右侧结果面板里。
        </p>

        <div class="hero-actions">
          <button class="primary-button" type="button" @click="openTool('json-formatter')">进入工作台</button>
          <button class="ghost-button" type="button" @click="openTool('timestamp')">试试时间工具</button>
        </div>
      </div>

      <aside class="hero-status">
        <article class="status-panel" :class="workspaceStore.bootstrapStatus.tone">
          <h2>{{ workspaceStore.bootstrapStatus.label }}</h2>
          <p>{{ workspaceStore.bootstrapStatus.detail }}</p>
          <small>DB: {{ DATABASE_URL }}</small>
        </article>

        <div class="stats-grid">
          <article v-for="stat in workspaceStore.toolStats" :key="stat.label" class="stat-card">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </article>
        </div>
      </aside>
    </section>

    <section class="home-grid">
      <article class="shell-card">
        <div class="section-header">
          <div>
            <h2>推荐工具</h2>
            <p>首屏只露出最常用的几个入口。</p>
          </div>
        </div>

        <div class="tool-card-grid">
          <button
            v-for="tool in workspaceStore.featuredTools"
            :key="tool.id"
            class="tool-card"
            type="button"
            @click="openTool(tool.id)"
          >
            <span class="tool-category">{{ tool.categoryName }}</span>
            <strong>{{ tool.name }}</strong>
            <p>{{ tool.description }}</p>
          </button>
        </div>
      </article>

      <article class="shell-card">
        <div class="section-header">
          <div>
            <h2>最近使用与收藏</h2>
            <p>保留轻首页需要的回到工作流入口。</p>
          </div>
        </div>

        <div class="mini-section">
          <h3>最近使用</h3>
          <div class="tag-row">
            <button
              v-for="tool in workspaceStore.recentTools"
              :key="tool.id"
              class="tag-chip"
              type="button"
              @click="openTool(tool.id)"
            >
              {{ tool.name }}
            </button>
          </div>
        </div>

        <div class="mini-section">
          <h3>收藏工具</h3>
          <div class="tag-row">
            <button
              v-for="tool in workspaceStore.favoriteTools"
              :key="tool.id"
              class="tag-chip favorite"
              type="button"
              @click="openTool(tool.id)"
            >
              ★ {{ tool.name }}
            </button>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>
