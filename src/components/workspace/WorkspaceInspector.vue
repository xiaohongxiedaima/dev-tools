<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useWorkspaceStore } from "../../stores/workspace";

const router = useRouter();
const workspaceStore = useWorkspaceStore();
const manualHistory = computed(() =>
  workspaceStore.manualHistory.filter((entry) => entry.tool_id === workspaceStore.activeToolId).slice(0, 5),
);
const autoHistory = computed(() =>
  workspaceStore.autoHistory.filter((entry) => entry.tool_id === workspaceStore.activeToolId).slice(0, 10),
);

function formatHistoryTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

async function restoreHistoryEntry(historyId: number, sourceType: "manual" | "auto") {
  const historyList = sourceType === "manual" ? manualHistory.value : autoHistory.value;
  const record = historyList.find((item) => item.id === historyId);

  if (!record) {
    workspaceStore.errorMessage = "未找到对应的历史记录。";
    return;
  }

  try {
    await workspaceStore.restoreHistoryEntry(record);
    void router.push({ name: "workspace", params: { toolId: workspaceStore.activeToolId } });
  } catch (error) {
    workspaceStore.errorMessage = error instanceof Error ? error.message : String(error);
  }
}

async function deleteHistoryEntry(historyId: number) {
  try {
    await workspaceStore.deleteHistoryEntry(historyId);
  } catch (error) {
    workspaceStore.errorMessage = error instanceof Error ? error.message : String(error);
  }
}

async function clearHistoryEntries(sourceType: "manual" | "auto") {
  try {
    await workspaceStore.clearHistoryEntries(sourceType);
  } catch (error) {
    workspaceStore.errorMessage = error instanceof Error ? error.message : String(error);
  }
}

function openTool(toolId: string) {
  workspaceStore.setActiveTool(toolId);
  void router.push({ name: "workspace", params: { toolId } });
}
</script>

<template>
  <aside class="inspector shell-card">
    <section class="inspector-section">
      <div class="history-header-row">
        <button class="inspector-toggle" type="button" @click="workspaceStore.toggleInspectorSection('manual-history')">
          <span>手动保存</span>
          <span>{{ workspaceStore.isInspectorSectionOpen("manual-history") ? "收起" : "展开" }}</span>
        </button>
        <button class="ghost-button small" type="button" :disabled="manualHistory.length === 0" @click="clearHistoryEntries('manual')">
          一键清空
        </button>
      </div>
      <div v-if="workspaceStore.isInspectorSectionOpen('manual-history')" class="inspector-body">
        <div v-if="manualHistory.length > 0" class="history-list">
          <article
            v-for="entry in manualHistory"
            :key="entry.id"
            class="history-card"
          >
            <button class="history-open-button" type="button" @click="restoreHistoryEntry(entry.id, 'manual')">
              <strong>{{ entry.title || "未命名历史记录" }}</strong>
              <div class="history-meta-row">
                <time>{{ formatHistoryTime(entry.created_at) }}</time>
                <button class="history-inline-action" type="button" @click.stop="deleteHistoryEntry(entry.id)">删除</button>
              </div>
            </button>
          </article>
        </div>
        <p v-else class="history-empty">当前工具还没有手动保存的历史记录。</p>
      </div>
    </section>

    <section class="inspector-section">
      <div class="history-header-row">
        <button class="inspector-toggle" type="button" @click="workspaceStore.toggleInspectorSection('auto-history')">
          <span>自动输入历史</span>
          <span>{{ workspaceStore.isInspectorSectionOpen("auto-history") ? "收起" : "展开" }}</span>
        </button>
        <button class="ghost-button small" type="button" :disabled="autoHistory.length === 0" @click="clearHistoryEntries('auto')">
          一键清空
        </button>
      </div>
      <div v-if="workspaceStore.isInspectorSectionOpen('auto-history')" class="inspector-body">
        <div v-if="autoHistory.length > 0" class="history-list">
          <article
            v-for="entry in autoHistory"
            :key="entry.id"
            class="history-card"
          >
            <button class="history-open-button" type="button" @click="restoreHistoryEntry(entry.id, 'auto')">
              <strong>{{ entry.title || "未命名历史记录" }}</strong>
              <div class="history-meta-row">
                <time>{{ formatHistoryTime(entry.created_at) }}</time>
                <button class="history-inline-action" type="button" @click.stop="deleteHistoryEntry(entry.id)">删除</button>
              </div>
            </button>
          </article>
        </div>
        <p v-else class="history-empty">当前工具的输入内容会在停顿后自动记录到这里。</p>
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
