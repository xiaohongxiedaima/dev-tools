<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import { useWorkspaceStore } from "./stores/workspace";

const workspaceStore = useWorkspaceStore();

onMounted(async () => {
  await workspaceStore.bootstrapWorkspace();
});
</script>

<template>
  <main class="app-shell">
    <RouterView />
  </main>
</template>

<style>
:root {
  color: #0f172a;
  background:
    radial-gradient(circle at top, rgba(59, 130, 246, 0.1), transparent 26%),
    linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
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
  background:
    radial-gradient(circle at top, rgba(59, 130, 246, 0.1), transparent 26%),
    linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
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
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  padding: 20px;
}

.shell-card {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
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
  position: sticky;
  top: 0;
  z-index: 50;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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

.primary-button.small {
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
}

.ghost-button.small.icon-only,
.primary-button.small.icon-only {
  width: 38px;
  min-width: 38px;
  padding-inline: 0;
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

.home-view {
  display: grid;
  gap: 20px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
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

.redis-config-grid,
.redis-debug-block,
.redis-log-card,
.redis-trace-card {
  display: grid;
  gap: 12px;
}

.redis-config-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 16px;
}

.redis-config-field {
  display: grid;
  gap: 8px;
}

.redis-config-field--full {
  grid-column: 1 / -1;
}

.redis-config-field span,
.redis-debug-block h3,
.redis-summary-row,
.redis-trace-top-row,
.redis-trace-args,
.redis-trace-error,
.redis-log-card strong {
  color: #c7d6ec;
}

.redis-config-field input,
.redis-config-field textarea {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.88);
  color: #e8edf7;
  padding: 12px 14px;
  box-sizing: border-box;
}

.redis-config-field textarea {
  resize: vertical;
  min-height: 96px;
}

.redis-mode-row,
.redis-summary-row,
.redis-trace-top-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.redis-summary-row {
  margin-top: 12px;
  font-size: 13px;
}

.redis-debug-block {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.redis-debug-block-header h3 {
  margin: 0;
}

.redis-log-card,
.redis-trace-card {
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.44);
}

.redis-log-card pre,
.redis-trace-card pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #e8edf7;
}

.redis-trace-args,
.redis-trace-error {
  margin: 0;
  font-size: 13px;
}

.redis-trace-error {
  color: #fca5a5;
}

.tool-card-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
  --workspace-divider-size: 10px;
  display: grid;
  gap: 0;
  grid-template-columns:
    var(--workspace-sidebar-width, 280px)
    var(--workspace-divider-size)
    minmax(0, 1fr)
    var(--workspace-divider-size)
    var(--workspace-inspector-width, 320px);
  flex: 1;
  min-height: 0;
}

.workspace-view--inspector-hidden {
  grid-template-columns: var(--workspace-sidebar-width, 280px) var(--workspace-divider-size) minmax(0, 1fr);
}

.sidebar {
  display: flex;
  flex-direction: column;
  padding: 14px;
  min-height: 720px;
  min-width: 0;
  overflow: hidden;
}

.inspector {
  display: flex;
  flex-direction: column;
  padding: 14px;
  min-height: 720px;
  min-width: 0;
  overflow-y: auto;
}

.inspector-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 10;
  padding-bottom: 8px;
  background: rgba(8, 15, 30, 0.72);
  backdrop-filter: blur(18px);
}

.inspector-top-row h2 {
  margin: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 10;
  padding-bottom: 8px;
  background: rgba(8, 15, 30, 0.72);
  backdrop-filter: blur(18px);
}

.sidebar-header h2 {
  margin: 0;
}

.sidebar-scroll {
  display: grid;
  gap: 8px;
  flex: 1;
  overflow-y: auto;
}

.workspace-resize-handle {
  position: relative;
  align-self: stretch;
  min-height: 100%;
  width: var(--workspace-divider-size, 10px);
  cursor: col-resize;
  user-select: none;
  touch-action: none;
}

.workspace-resize-handle::before,
.workspace-panel-resize-handle::before {
  content: "";
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 50%;
  width: 2px;
  border-radius: 999px;
  transform: translateX(-50%);
  background: rgba(148, 163, 184, 0.2);
  transition:
    background 160ms ease,
    box-shadow 160ms ease;
}

.workspace-resize-handle::after,
.workspace-panel-resize-handle::after {
  content: "";
  position: absolute;
  inset: 0;
}

.workspace-resize-handle:hover::before,
.workspace-resize-handle:focus-visible::before,
.workspace-panel-resize-handle:hover::before,
.workspace-panel-resize-handle:focus-visible::before {
  background: rgba(96, 165, 250, 0.88);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.16);
}

.tool-group {
  margin-bottom: 4px;
}

.tool-group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 3px;
  padding: 2px 2px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
  font-size: inherit;
  font-family: inherit;
}

.tool-group-title:hover {
  color: #dfeaff;
}

.tool-group-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #7f97ba;
  font-size: 0.82rem;
  flex-shrink: 0;
}

.tool-group-count {
  min-width: 1.4em;
  text-align: center;
}

.tool-group-chevron {
  display: inline-block;
  transition: transform 0.25s ease;
  font-size: 0.75rem;
}

.tool-group-chevron.collapsed {
  transform: rotate(-90deg);
}

.tool-group-items {
  display: grid;
  gap: 0;
}

.tool-nav {
  width: 100%;
  display: block;
  padding: 8px 10px;
  margin-bottom: 4px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-left: 3px solid transparent;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.46);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.tool-nav:hover {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(30, 41, 59, 0.55);
}

.tool-nav-copy {
  display: grid;
  gap: 4px;
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
  border-color: rgba(96, 165, 250, 0.42);
  border-left-color: #60a5fa;
  background: rgba(37, 99, 235, 0.18);
  box-shadow: 0 0 12px rgba(37, 99, 235, 0.12);
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
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
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
  position: sticky;
  top: 0;
  z-index: 5;
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
  display: flex;
  gap: 0;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

.workspace-panels > .editor-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.workspace-panel-resize-handle {
  position: relative;
  flex: 0 0 var(--workspace-divider-size, 10px);
  align-self: stretch;
  cursor: col-resize;
  touch-action: none;
}

.workspace-panel-resize-handle:focus-visible {
  outline: none;
}

.editor-panel {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
}

.panel-header {
  position: sticky;
  top: 0;
  z-index: 5;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
  background: inherit;
}

.panel-header-copy {
  flex: 1;
  min-width: 0;
}

.panel-header-tools {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
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

.workspace-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.workspace-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  margin-top: 6px;
}

.workspace-action-bar-left,
.workspace-action-bar-right {
  min-width: 0;
}

.workspace-action-bar-left {
  flex: 1 1 auto;
}

.workspace-action-bar-right {
  display: flex;
  justify-content: flex-end;
  flex: 0 1 auto;
  margin-left: auto;
}

.workspace-action-row-measure {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  left: -9999px;
  top: -9999px;
  display: flex;
  gap: 10px;
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

.editor-content-shell,
.output-preview {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  height: 0;
  min-height: 0;
}

.editor-content-shell {
  overflow: hidden;
}

.editor-search-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
  max-width: calc(100% - 16px);
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  background: rgba(7, 17, 31, 0.94);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
}

.editor-search-row--overlay {
  margin-top: 0;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
}

.editor-search-row--overlay input {
  min-width: 150px;
  flex-basis: 150px;
  padding: 0.45rem 0.6rem;
  font-size: 0.9rem;
}

.editor-search-row--overlay .ghost-button.small {
  padding: 0.42rem 0.62rem;
  border-radius: 10px;
  font-size: 0.82rem;
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
  flex: 1 1 0;
  height: 0;
  min-height: 0;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 16px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.82);
}

.code-editor-shell .cm-editor {
  height: 100%;
  min-height: 0;
  background: transparent;
  font-size: 0.95rem;
}

.code-editor-shell .cm-scroller {
  height: 100%;
  min-height: 0;
  overflow: auto !important;
  font-family:
    "SFMono-Regular", SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, monospace;
}

.code-editor-shell .cm-content,
.code-editor-shell .cm-gutter {
  min-height: 100%;
}

.code-editor-shell .cm-focused {
  outline: none;
}

.output-preview {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.56);
  overflow: auto;
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
.preset-card span,
.redis-config-field span,
.redis-debug-block h3,
.redis-summary-row,
.redis-trace-top-row,
.redis-trace-args,
.redis-log-card strong,
.history-meta-row,
.history-empty,
.tool-group-meta,
.bullet-list,
.toggle-line {
  color: #64748b;
}

.topbar-context {
  border-left-color: rgba(148, 163, 184, 0.24);
}

.status-chip,
.tool-category,
.mini-badge,
.tag-chip.favorite,
.nav-button[aria-current="page"],
.json-action-active,
.tool-nav.active {
  border-color: rgba(59, 130, 246, 0.24);
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
}

.search-shell input,
textarea,
.redis-config-field input,
.redis-config-field textarea,
.editor-search-row input {
  border-color: rgba(148, 163, 184, 0.28);
  background: #fff;
  color: #0f172a;
}

.primary-button {
  background: linear-gradient(135deg, #2563eb, #60a5fa);
  color: #fff;
}

.ghost-button,
.icon-button,
.tag-chip {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.94);
  color: #334155;
}

.ghost-button.json-action-active,
.ghost-button[aria-pressed="true"] {
  border-color: rgba(59, 130, 246, 0.24);
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
  box-shadow: 0 0 12px rgba(37, 99, 235, 0.12);
}

.status-panel,
.stat-card,
.tool-card,
.preset-card,
.redis-log-card,
.redis-trace-card,
.history-card,
.tool-nav,
.output-preview,
.json-tree-view {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
}

.status-panel.ok {
  border-color: rgba(34, 197, 94, 0.28);
}

.status-panel.error {
  border-color: rgba(239, 68, 68, 0.28);
}

.status-panel.muted {
  border-color: rgba(148, 163, 184, 0.24);
}

.status-panel small,
.eyebrow {
  color: #2563eb;
}

.redis-debug-block {
  border-top-color: rgba(148, 163, 184, 0.22);
}

.redis-log-card pre,
.redis-trace-card pre,
.inspector-toggle,
.workspace-header,
.panel-header,
.panel-header h2,
.workspace-header h1,
.brand-button strong,
.topbar-context strong,
.section-header h2,
.hero-copy h1,
.tool-nav-title-row,
.history-card strong {
  color: #0f172a;
}

.redis-trace-error,
.history-inline-action,
.ghost-button.small.danger {
  color: #dc2626;
}

.inspector-top-row,
.sidebar-header,
.panel-header,
.workspace-header {
  background: rgba(255, 255, 255, 0.94);
}

.workspace-resize-handle::before,
.workspace-panel-resize-handle::before {
  background: rgba(148, 163, 184, 0.38);
}

.workspace-resize-handle:hover::before,
.workspace-resize-handle:focus-visible::before,
.workspace-panel-resize-handle:hover::before,
.workspace-panel-resize-handle:focus-visible::before {
  background: rgba(59, 130, 246, 0.9);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.tool-group-title:hover {
  color: #1d4ed8;
}

.tool-nav:hover {
  border-color: rgba(96, 165, 250, 0.28);
  background: rgba(239, 246, 255, 0.98);
}

.editor-search-overlay {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

.code-editor-shell {
  border-color: rgba(148, 163, 184, 0.24);
  background: #fff;
}

.code-editor-shell .cm-editor {
  color: #0f172a;
}

.output-preview {
  background: #fff;
}

.json-tree-view {
  --vjs-key-color: #2563eb;
  --vjs-value-string-color: #059669;
  --vjs-value-number-color: #b45309;
  --vjs-value-boolean-color: #7c3aed;
  --vjs-value-null-color: #dc2626;
  color: #0f172a;
}

.preset-card code {
  color: #1e40af;
}

@media (max-width: 1280px) {
  .workspace-view {
    grid-template-columns: var(--workspace-sidebar-width, 260px) var(--workspace-divider-size) minmax(0, 1fr);
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

  .panel-header-tools {
    width: 100%;
    align-items: stretch;
  }

  .workspace-panel-resize-handle {
    display: none;
  }

  .workspace-panels > .editor-panel {
    flex-basis: auto !important;
  }

  .editor-search-overlay {
    left: 12px;
  }

  .editor-search-row--overlay {
    flex-wrap: wrap;
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
