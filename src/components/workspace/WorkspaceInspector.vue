<script setup lang="ts">
import { useRouter } from "vue-router";
import { useWorkspaceStore } from "../../stores/workspace";

const router = useRouter();
const workspaceStore = useWorkspaceStore();

function openTool(toolId: string) {
  workspaceStore.setActiveTool(toolId);
  void router.push({ name: "workspace", params: { toolId } });
}
</script>

<template>
  <aside class="inspector shell-card">
    <section class="inspector-section">
      <button class="inspector-toggle" type="button" @click="workspaceStore.toggleInspectorSection('status')">
        <span>状态面板</span>
        <span>{{ workspaceStore.isInspectorSectionOpen("status") ? "收起" : "展开" }}</span>
      </button>
      <div v-if="workspaceStore.isInspectorSectionOpen('status')" class="inspector-body">
        <p>这里专门放错误、说明、示例和辅助信息，不挤占中间主工作区。</p>
        <ul class="bullet-list">
          <li>顶部显示状态、错误和当前工具摘要</li>
          <li>中部放示例、操作提示和工具规则</li>
          <li>底部保留历史记录与常用预设入口</li>
        </ul>
      </div>
    </section>

    <section class="inspector-section">
      <button class="inspector-toggle" type="button" @click="workspaceStore.toggleInspectorSection('recent')">
        <span>最近使用</span>
        <span>{{ workspaceStore.isInspectorSectionOpen("recent") ? "收起" : "展开" }}</span>
      </button>
      <div v-if="workspaceStore.isInspectorSectionOpen('recent')" class="inspector-body">
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
    </section>

    <section class="inspector-section">
      <button class="inspector-toggle" type="button" @click="workspaceStore.toggleInspectorSection('favorites')">
        <span>常用工具</span>
        <span>{{ workspaceStore.isInspectorSectionOpen("favorites") ? "收起" : "展开" }}</span>
      </button>
      <div v-if="workspaceStore.isInspectorSectionOpen('favorites')" class="inspector-body">
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
    </section>

    <section class="inspector-section">
      <button class="inspector-toggle" type="button" @click="workspaceStore.toggleInspectorSection('presets')">
        <span>常用预设</span>
        <span>{{ workspaceStore.isInspectorSectionOpen("presets") ? "收起" : "展开" }}</span>
      </button>
      <div v-if="workspaceStore.isInspectorSectionOpen('presets')" class="inspector-body">
        <div class="preset-stack">
          <article v-for="preset in workspaceStore.favoritePresets" :key="preset.id" class="preset-card">
            <strong>{{ preset.name }}</strong>
            <span>{{ preset.category }}</span>
            <code>{{ preset.command }}</code>
          </article>
        </div>
      </div>
    </section>

    <section class="inspector-section">
      <button class="inspector-toggle" type="button" @click="workspaceStore.toggleInspectorSection('tips')">
        <span>使用建议</span>
        <span>{{ workspaceStore.isInspectorSectionOpen("tips") ? "收起" : "展开" }}</span>
      </button>
      <div v-if="workspaceStore.isInspectorSectionOpen('tips')" class="inspector-body">
        <ul class="bullet-list">
          <li v-for="tip in workspaceStore.workspaceTips" :key="tip">{{ tip }}</li>
        </ul>
      </div>
    </section>
  </aside>
</template>
