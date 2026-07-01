<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { useWorkspaceStore } from "./stores/workspace";

const route = useRoute();
const router = useRouter();
const workspaceStore = useWorkspaceStore();

const searchTerm = computed({
  get: () => workspaceStore.searchTerm,
  set: (value: string) => workspaceStore.setSearchTerm(value),
});

const headerContext = computed(() => {
  if (route.name === "workspace") {
    return {
      title: "工具工作台",
      description: `当前工具：${workspaceStore.activeTool.name}`,
      badge: workspaceStore.bootstrapStatus.label,
    };
  }

  return {
    title: "开发工具首页",
    description: "快速进入常用工具、最近使用和收藏内容。",
    badge: workspaceStore.bootstrapStatus.label,
  };
});

function goHome() {
  void router.push({ name: "home" });
}

function goWorkspace() {
  void router.push({
    name: "workspace",
    params: { toolId: workspaceStore.activeToolId },
  });
}

onMounted(async () => {
  await workspaceStore.bootstrapWorkspace();
});
</script>

<template>
  <main class="app-shell">
    <header class="topbar shell-card">
      <div class="topbar-main">
        <button class="brand-button" type="button" @click="goHome">
          <span class="brand-badge">DT</span>
          <span class="brand-copy">
            <strong>Dev Tools Desktop</strong>
            <small>服务端开发工具箱</small>
          </span>
        </button>

        <div class="topbar-context">
          <div>
            <strong>{{ headerContext.title }}</strong>
            <p>{{ headerContext.description }}</p>
          </div>
          <span class="status-chip">{{ headerContext.badge }}</span>
        </div>
      </div>

      <div class="topbar-side">
        <label class="search-shell">
          <input v-model="searchTerm" type="text" placeholder="搜索 JSON、时间戳、URL、JWT..." />
        </label>

        <div class="topbar-actions">
          <button
            class="ghost-button nav-button"
            type="button"
            :aria-current="route.name === 'home' ? 'page' : undefined"
            @click="goHome"
          >
            首页
          </button>
          <button
            class="ghost-button nav-button"
            type="button"
            :aria-current="route.name === 'workspace' ? 'page' : undefined"
            @click="goWorkspace"
          >
            工作台
          </button>
          <button
            class="primary-button"
            type="button"
            :disabled="workspaceStore.isInitializing"
            @click="workspaceStore.bootstrapWorkspace"
          >
            {{ workspaceStore.isInitializing ? "刷新中..." : "刷新工作区" }}
          </button>
          <button
            v-if="route.name === 'workspace'"
            class="icon-button"
            type="button"
            :aria-label="workspaceStore.inspectorVisible ? '隐藏右侧历史中心' : '显示右侧历史中心'"
            :title="workspaceStore.inspectorVisible ? '隐藏右侧历史中心' : '显示右侧历史中心'"
            @click="workspaceStore.toggleInspectorVisibility()"
          >
            {{ workspaceStore.inspectorVisible ? "⟫" : "⟪" }}
          </button>
        </div>
      </div>
    </header>

    <RouterView />
  </main>
</template>

<style>
:root {
  color: #e8edf7;
  background:
    radial-gradient(circle at top, rgba(56, 189, 248, 0.16), transparent 28%),
    linear-gradient(180deg, #07111f 0%, #0f172a 100%);
  font-family:
    Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  min-width: 360px;
  min-height: 100vh;
}

button,
input,
textarea {
  font: inherit;
}

#app {
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
  padding: 20px;
}

.shell-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 22px;
  background: rgba(8, 15, 30, 0.72);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(18px);
}

.topbar,
.hero,
.home-grid,
.workspace-view,
.workspace-panels,
.hero-actions,
.stats-grid,
.section-header,
.panel-header,
.inline-actions,
.topbar-actions {
  display: flex;
  gap: 16px;
}

.topbar {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(420px, 0.9fr);
  align-items: center;
  gap: 20px;
  padding: 18px 20px;
  margin-bottom: 20px;
}

.topbar-main,
.topbar-side {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.topbar-side {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  justify-content: stretch;
}

.brand-button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.brand-badge {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #2563eb, #8b5cf6 60%, #f97316);
  color: white;
  font-weight: 800;
}

.brand-copy {
  display: grid;
  gap: 3px;
  text-align: left;
}

.brand-button strong,
.topbar-context strong,
.status-panel h2,
.section-header h2,
.panel-header h2,
.workspace-header h1,
.hero-copy h1 {
  display: block;
}

.brand-button small,
.topbar-context p,
.search-shell span,
.summary,
.status-panel p,
.section-header p,
.panel-header p,
.tool-nav small,
.tool-card p,
.inspector-section p,
.preset-card span {
  color: #9cb0ce;
}

.topbar-context {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding-left: 18px;
  border-left: 1px solid rgba(148, 163, 184, 0.14);
}

.topbar-context p {
  margin: 4px 0 0;
  font-size: 0.92rem;
}

.status-chip {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  padding: 0.38rem 0.72rem;
  border: 1px solid rgba(96, 165, 250, 0.26);
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.14);
  color: #9bc2ff;
  font-size: 0.82rem;
  font-weight: 700;
}

.search-shell {
  min-width: 0;
  max-width: none;
  width: 100%;
}

.search-shell span {
  display: block;
  margin-bottom: 6px;
  font-size: 0.82rem;
}

.search-shell input,
textarea {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.76);
  color: #e8edf7;
}

.search-shell input {
  padding: 0.8rem 0.95rem;
  box-sizing: border-box;
}

.topbar-actions {
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.primary-button,
.ghost-button,
.icon-button,
.tool-card,
.tag-chip,
.tool-nav,
.favorite-toggle {
  cursor: pointer;
}

.primary-button,
.ghost-button {
  padding: 0.78rem 1.05rem;
  border-radius: 14px;
  border: 1px solid transparent;
}

.primary-button {
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  color: white;
  font-weight: 700;
}

.ghost-button {
  background: rgba(148, 163, 184, 0.08);
  border-color: rgba(148, 163, 184, 0.14);
  color: #dbe7f6;
}

.ghost-button.small {
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
}

.icon-button {
  width: 44px;
  height: 44px;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.08);
  color: #dbe7f6;
  font-size: 1.1rem;
  line-height: 1;
}

.nav-button[aria-current="page"] {
  border-color: rgba(96, 165, 250, 0.35);
  background: rgba(37, 99, 235, 0.16);
  color: #dfeaff;
}

.home-view,
.workspace-main,
.sidebar,
.inspector {
  display: grid;
  gap: 20px;
}

.hero {
  align-items: stretch;
  padding: 28px;
}

.hero-copy,
.hero-status {
  flex: 1;
}

.eyebrow {
  margin: 0 0 12px;
  color: #8db6ff;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

.hero-copy h1,
.workspace-header h1 {
  margin-bottom: 12px;
  font-size: clamp(2rem, 4vw, 3.25rem);
  line-height: 1.05;
}

.summary {
  max-width: 720px;
  margin-bottom: 0;
  line-height: 1.6;
}

.summary.narrow {
  max-width: 560px;
}

.hero-actions {
  margin-top: 24px;
}

.hero-status {
  display: grid;
  gap: 16px;
  max-width: 360px;
}

.status-panel,
.stat-card,
.tool-card,
.preset-card {
  border-radius: 18px;
}

.status-panel {
  padding: 18px;
  background: rgba(15, 23, 42, 0.72);
}

.status-panel.ok {
  border: 1px solid rgba(74, 222, 128, 0.18);
}

.status-panel.error {
  border: 1px solid rgba(248, 113, 113, 0.18);
}

.status-panel.muted {
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.status-panel small {
  color: #7eb5ff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.stat-card {
  padding: 18px 16px;
  background: rgba(15, 23, 42, 0.6);
  text-align: center;
}

.stat-card strong {
  display: block;
  margin-bottom: 6px;
  font-size: 1.65rem;
}

.home-grid {
  align-items: stretch;
}

.home-grid > * {
  flex: 1;
  padding: 24px;
}

.section-header {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header.compact {
  margin-bottom: 12px;
}

.tool-card-grid,
.preset-stack {
  display: grid;
  gap: 12px;
}

.tool-card-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tool-card {
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.62);
  color: inherit;
  text-align: left;
}

.tool-category,
.mini-badge {
  display: inline-flex;
  width: fit-content;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.14);
  color: #8db6ff;
  font-size: 0.78rem;
  font-weight: 700;
}

.mini-section + .mini-section {
  margin-top: 22px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-chip {
  padding: 0.58rem 0.8rem;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.62);
  color: #dce7f7;
}

.tag-chip.favorite {
  border-color: rgba(141, 182, 255, 0.32);
}

.workspace-view {
  display: grid;
  grid-template-columns:
    var(--workspace-sidebar-width, 280px)
    10px
    minmax(0, 1fr)
    10px
    var(--workspace-inspector-width, 320px);
  align-items: start;
}

.workspace-view--inspector-hidden {
  grid-template-columns: var(--workspace-sidebar-width, 280px) 10px minmax(0, 1fr);
}

.sidebar,
.inspector {
  padding: 20px;
  min-height: 720px;
  min-width: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sidebar-scroll {
  display: grid;
  gap: 18px;
}

.workspace-resize-handle {
  position: relative;
  align-self: stretch;
  min-height: 100%;
  cursor: col-resize;
  user-select: none;
}

.workspace-resize-handle::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 4px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  transition: background 0.2s ease;
}

.workspace-resize-handle:hover::before {
  background: rgba(96, 165, 250, 0.55);
}

.tool-group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.tool-group-title span {
  color: #7f97ba;
  font-size: 0.82rem;
}

.tool-nav {
  width: 100%;
  display: block;
  padding: 14px;
  margin-bottom: 10px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.46);
  color: inherit;
  text-align: left;
}

.tool-nav-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.tool-nav-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tool-nav-title-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tool-nav-copy small {
  display: block;
  line-height: 1.45;
}

.tool-nav.active {
  border-color: rgba(96, 165, 250, 0.36);
  background: rgba(37, 99, 235, 0.18);
}

.tool-nav-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.favorite-toggle {
  padding: 0;
  border: 0;
  background: transparent;
  color: #fbbf24;
  font-size: 1rem;
}

.workspace-main {
  min-width: 0;
}

.workspace-header,
.editor-panel {
  padding: 22px;
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.workspace-header.compact {
  padding: 16px 18px;
}

.workspace-header.compact .eyebrow {
  margin: 0 0 4px;
}

.workspace-header.compact h1 {
  margin: 0;
  font-size: clamp(1.35rem, 2.2vw, 1.9rem);
}

.workspace-header.compact .summary {
  line-height: 1.45;
  font-size: 0.92rem;
}

.workspace-toolbar {
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  max-width: none;
}

.toggle-line.compact {
  padding: 0.45rem 0.1rem;
}

.inline-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.workspace-panels {
  align-items: stretch;
}

.workspace-panels > * {
  flex: 1;
  min-width: 0;
}

.panel-header {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-header.compact {
  margin-bottom: 10px;
}

.json-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.json-input-header-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 6px;
}

.json-output-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.editor-search-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.editor-search-row input {
  min-width: 220px;
  flex: 1 1 220px;
  padding: 0.6rem 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.76);
  color: #e8edf7;
}

.json-action-active {
  border-color: rgba(96, 165, 250, 0.35);
  background: rgba(37, 99, 235, 0.16);
  color: #dfeaff;
}

.toggle-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #c4d6f2;
}

textarea {
  min-height: 440px;
  padding: 16px;
  resize: vertical;
  line-height: 1.55;
}

.code-editor-shell {
  min-height: 440px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 16px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.82);
}

.code-editor-shell .cm-editor {
  min-height: 440px;
  background: transparent;
  font-size: 0.95rem;
}

.code-editor-shell .cm-scroller {
  min-height: 440px;
  font-family:
    "SFMono-Regular", SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, monospace;
}

.code-editor-shell .cm-content,
.code-editor-shell .cm-gutter {
  min-height: 440px;
}

.code-editor-shell .cm-focused {
  outline: none;
}

.output-preview {
  min-height: 440px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.56);
  overflow: hidden;
}

.output-preview > pre,
.output-preview > strong {
  padding: 18px;
}

.json-tree-view {
  --vjs-font-family:
    "SFMono-Regular", SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, monospace;
  --vjs-key-color: #93c5fd;
  --vjs-value-string-color: #86efac;
  --vjs-value-number-color: #f9a8d4;
  --vjs-value-boolean-color: #fcd34d;
  --vjs-value-null-color: #c4b5fd;
  --vjs-background-color: transparent;
  color: #dbe7f6;
  padding: 10px 2px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.28);
}

pre,
code {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family:
    "SFMono-Regular", SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, monospace;
}

.inspector-section + .inspector-section {
  margin-top: 22px;
}

.inspector-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #e8edf7;
  text-align: left;
  font-weight: 700;
}

.inspector-body {
  margin-top: 12px;
}

.bullet-list {
  padding-left: 18px;
  color: #dce7f7;
}

.bullet-list li + li {
  margin-top: 8px;
}

.preset-stack {
  grid-template-columns: 1fr;
}

.preset-card {
  padding: 14px;
  background: rgba(15, 23, 42, 0.56);
}

.preset-card code {
  display: block;
  margin-top: 8px;
  color: #bdd3f2;
}

.history-list {
  display: grid;
  gap: 12px;
}

.history-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.56);
  color: inherit;
  text-align: left;
}

.history-open-button {
  width: 100%;
  display: grid;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}

.history-card strong {
  display: block;
  line-height: 1.4;
}

.history-header-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.history-header-row .inspector-toggle {
  flex: 1;
}

.history-meta-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 12px;
  color: #9cb0ce;
  font-size: 0.83rem;
}

.history-inline-action {
  padding: 0;
  border: 0;
  background: transparent;
  color: #fca5a5;
  cursor: pointer;
}

.history-empty {
  margin: 0;
  color: #9cb0ce;
}

.ghost-button.small.danger {
  color: #fca5a5;
}

@media (max-width: 1280px) {
  .workspace-view {
    grid-template-columns: var(--workspace-sidebar-width, 260px) 10px minmax(0, 1fr);
  }

  .workspace-resize-handle--inspector {
    display: none;
  }

  .inspector {
    grid-column: 1 / -1;
    min-height: auto;
  }
}

@media (max-width: 960px) {
  .topbar,
  .hero,
  .home-grid,
  .workspace-view,
  .workspace-header,
  .workspace-panels {
    display: flex;
    flex-direction: column;
  }

  .workspace-resize-handle {
    display: none;
  }

  .topbar {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .topbar-main,
  .topbar-side {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .topbar-side {
    justify-content: flex-start;
  }

  .topbar-context {
    padding-left: 0;
    border-left: 0;
  }

  .hero-status {
    max-width: none;
  }

  .tool-card-grid {
    grid-template-columns: 1fr;
  }

  .sidebar,
  .inspector {
    min-height: auto;
  }

  .workspace-toolbar {
    max-width: none;
    justify-content: flex-start;
  }
}
</style>
