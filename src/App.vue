<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import { useWorkspaceStore } from "./stores/workspace";
import { useThemeStore } from "./stores/theme";

const workspaceStore = useWorkspaceStore();
const themeStore = useThemeStore();

onMounted(async () => {
  // 确保主题属性在挂载时已设置
  void themeStore.isDark;
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
  --dt-bg-gradient: linear-gradient(180deg, #faf8ff 0%, #f1ecff 100%);
  --dt-bg-radial: radial-gradient(circle at top, rgba(139, 92, 246, 0.1), transparent 26%);
  --dt-surface: rgba(255, 255, 255, 0.92);
  --dt-surface-strong: rgba(255, 255, 255, 0.94);
  --dt-surface-solid: #fff;
  --dt-surface-hover: rgba(243, 240, 255, 0.98);
  --dt-text: #1e1b2e;
  --dt-text-secondary: #6b6480;
  --dt-text-muted: #9b94b0;
  --dt-border: rgba(163, 152, 184, 0.22);
  --dt-border-strong: rgba(163, 152, 184, 0.28);
  --dt-divider: rgba(163, 152, 184, 0.14);
  --dt-primary: #7c3aed;
  --dt-primary-hover: #a78bfa;
  --dt-primary-pressed: #6d28d9;
  --dt-primary-bg: rgba(139, 92, 246, 0.1);
  --dt-primary-border: rgba(139, 92, 246, 0.24);
  --dt-primary-shadow: rgba(124, 58, 237, 0.12);
  --dt-primary-glow: rgba(167, 139, 250, 0.16);
  --dt-danger: #dc2626;
  --dt-danger-soft: #fca5a5;
  --dt-danger-bg: rgba(239, 68, 68, 0.28);
  --dt-success-border: rgba(34, 197, 94, 0.28);
  --dt-gold: #fbbf24;
  --dt-brand-gradient: linear-gradient(135deg, #7c3aed, #c026d3 60%, #f97316);
  --dt-shadow-card: 0 18px 40px rgba(30, 27, 46, 0.08);
  --dt-shadow-overlay: 0 12px 28px rgba(30, 27, 46, 0.12);
  --dt-resize-handle: rgba(163, 152, 184, 0.38);
  --dt-resize-handle-active: rgba(139, 92, 246, 0.9);
  --vjs-key-color: #7c3aed;
  --vjs-value-string-color: #059669;
  --vjs-value-number-color: #b45309;
  --vjs-value-boolean-color: #9333ea;
  --vjs-value-null-color: #dc2626;

  color: var(--dt-text);
  background: var(--dt-bg-radial), var(--dt-bg-gradient);
  font-family:
    Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

[data-theme="dark"] {
  --dt-bg-gradient: linear-gradient(180deg, #1a1530 0%, #2a2245 100%);
  --dt-bg-radial: radial-gradient(circle at top, rgba(139, 92, 246, 0.15), transparent 26%);
  --dt-surface: rgba(42, 34, 69, 0.85);
  --dt-surface-strong: rgba(42, 34, 69, 0.94);
  --dt-surface-solid: #2a2245;
  --dt-surface-hover: rgba(56, 46, 92, 0.6);
  --dt-text: #e8e4f0;
  --dt-text-secondary: #a89fc0;
  --dt-text-muted: #7a7290;
  --dt-border: rgba(163, 152, 184, 0.28);
  --dt-border-strong: rgba(163, 152, 184, 0.4);
  --dt-divider: rgba(163, 152, 184, 0.2);
  --dt-primary: #a78bfa;
  --dt-primary-hover: #c4b5fd;
  --dt-primary-pressed: #8b5cf6;
  --dt-primary-bg: rgba(167, 139, 250, 0.15);
  --dt-primary-border: rgba(167, 139, 250, 0.3);
  --dt-primary-shadow: rgba(167, 139, 250, 0.2);
  --dt-primary-glow: rgba(167, 139, 250, 0.24);
  --dt-danger: #fca5a5;
  --dt-danger-soft: #fca5a5;
  --dt-danger-bg: rgba(239, 68, 68, 0.3);
  --dt-success-border: rgba(52, 211, 153, 0.3);
  --dt-gold: #fbbf24;
  --dt-brand-gradient: linear-gradient(135deg, #7c3aed, #c026d3 60%, #f97316);
  --dt-shadow-card: 0 18px 40px rgba(0, 0, 0, 0.3);
  --dt-shadow-overlay: 0 12px 28px rgba(0, 0, 0, 0.4);
  --dt-resize-handle: rgba(163, 152, 184, 0.5);
  --dt-resize-handle-active: rgba(167, 139, 250, 0.9);
  --vjs-key-color: #a78bfa;
  --vjs-value-string-color: #34d399;
  --vjs-value-number-color: #fbbf24;
  --vjs-value-boolean-color: #c4b5fd;
  --vjs-value-null-color: #fca5a5;
}

/* Arco Design 主色对齐为紫色 */
:root {
  --arcoblue-6: 124, 58, 237;
}

body {
  margin: 0;
  min-width: 360px;
  min-height: 100vh;
  background: var(--dt-bg-radial), var(--dt-bg-gradient);
}

button,
input,
textarea {
  font: inherit;
}

*,
*::before,
*::after {
  transition: background-color 0.25s ease, border-color 0.25s ease, color 0.2s ease;
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
  border: 1px solid var(--dt-border);
  border-radius: 22px;
  background: var(--dt-surface);
  box-shadow: var(--dt-shadow-card);
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
  background: var(--dt-brand-gradient);
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
  color: var(--dt-text-muted);
}

.topbar-context {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding-left: 18px;
  border-left: 1px solid var(--dt-divider);
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
  border: 1px solid var(--dt-primary-border);
  border-radius: 999px;
  background: var(--dt-primary-bg);
  color: var(--dt-primary);
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
  border: 1px solid var(--dt-border-strong);
  border-radius: 16px;
  background: var(--dt-surface-solid);
  color: var(--dt-text);
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
  background: linear-gradient(135deg, var(--dt-primary), var(--dt-primary-hover));
  color: white;
  font-weight: 700;
}

.ghost-button {
  background: var(--dt-surface-strong);
  border-color: var(--dt-divider);
  color: var(--dt-text);
}

.ghost-button.small {
  padding: 0.35rem 0.6rem;
  border-radius: 10px;
  font-size: 0.85rem;
}

.primary-button.small {
  padding: 0.35rem 0.6rem;
  border-radius: 10px;
  font-size: 0.85rem;
}

.ghost-button.small.icon-only,
.primary-button.small.icon-only {
  width: 38px;
  min-width: 38px;
  padding-inline: 0;
}

/* redis 配置区收紧按钮：不影响执行调试主按钮 */
.redis-tight-btn {
  padding: 0.24rem 0.5rem;
  border-radius: 8px;
  font-size: 11px;
  gap: 3px;
}

.redis-tight-btn.icon-only {
  width: 26px;
  min-width: 26px;
  height: 26px;
  padding-inline: 0;
}

.icon-button {
  width: 44px;
  height: 44px;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--dt-divider);
  border-radius: 14px;
  background: var(--dt-surface-strong);
  color: var(--dt-text);
  font-size: 1.1rem;
  line-height: 1;
}

.nav-button[aria-current="page"] {
  border-color: var(--dt-primary-border);
  background: var(--dt-primary-bg);
  color: var(--dt-primary);
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
  color: var(--dt-primary);
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
  background: var(--dt-surface);
}

.status-panel.ok {
  border: 1px solid var(--dt-success-border);
}

.status-panel.error {
  border: 1px solid var(--dt-danger-bg);
}

.status-panel.muted {
  border: 1px solid var(--dt-border-strong);
}

.status-panel small {
  color: var(--dt-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.stat-card {
  padding: 18px 16px;
  background: var(--dt-surface);
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
.redis-log-card {
  display: grid;
  gap: 8px;
}

.redis-config-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 10px;
}

.redis-config-field {
  display: grid;
  gap: 6px;
}

.redis-config-field--full {
  grid-column: 1 / -1;
}

/* Redis 地址字段：文案与控件同行 */
.redis-address-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.redis-field-label {
  flex: 0 0 80px;
  white-space: nowrap;
  text-align: right;
  color: var(--dt-text-secondary);
  font-size: 13px;
}

/* redis 配置各区块之间加分隔线 */
.redis-config-field + .redis-config-field {
  padding-top: 8px;
  border-top: 1px solid var(--dt-divider);
}

.redis-config-field span,
.redis-debug-block h3,
.redis-summary-row,
.redis-trace-error,
.redis-log-card strong {
  color: var(--dt-text-secondary);
}

.redis-config-field input,
.redis-config-field textarea {
  width: 100%;
  border: 1px solid var(--dt-border-strong);
  border-radius: 10px;
  background: var(--dt-surface-solid);
  color: var(--dt-text);
  padding: 8px 12px;
  box-sizing: border-box;
}

.redis-config-field textarea {
  resize: vertical;
  min-height: 72px;
}

.redis-mode-row,
.redis-summary-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.redis-summary-row {
  margin-top: 12px;
  font-size: 13px;
}

.redis-summary-result {
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

/* Redis 地址行：下拉选择（含 url 副标题）+ 增删改按钮单行 */
.redis-address-row {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: nowrap;
}

/* 地址操作折叠菜单 */
.redis-address-menu {
  position: relative;
  flex: 0 0 auto;
}

.redis-address-menu-popover {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
  padding: 4px;
  border: 1px solid var(--dt-border);
  border-radius: 10px;
  background: var(--dt-surface-strong);
  box-shadow: var(--dt-shadow-overlay);
}

.redis-address-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--dt-text);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}

.redis-address-menu-item:hover:not(:disabled) {
  background: var(--dt-primary-bg);
}

.redis-address-menu-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.redis-address-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 15;
}

.redis-address-select-shell {
  position: relative;
  flex: 1 1 240px;
  display: flex;
  align-items: center;
  min-width: 0;
}

.redis-address-select {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 1px solid var(--dt-border-strong);
  border-radius: 10px;
  background: var(--dt-surface-solid);
  color: var(--dt-text);
  padding: 0 30px 0 12px;
  box-sizing: border-box;
  font: inherit;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

/* 自定义下拉箭头 */
.redis-address-select-shell::after {
  content: "";
  position: absolute;
  right: 12px;
  top: 50%;
  width: 7px;
  height: 7px;
  border-right: 2px solid var(--dt-text-muted);
  border-bottom: 2px solid var(--dt-text-muted);
  transform: translateY(-65%) rotate(45deg);
  pointer-events: none;
}

.redis-address-select:focus {
  outline: none;
  border-color: var(--dt-primary);
}

.redis-address-select option {
  background: var(--dt-text);
  color: var(--dt-text);
}

.redis-address-draft {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 6px;
}

.redis-address-draft input {
  flex: 1 1 180px;
  border: 1px solid var(--dt-border-strong);
  border-radius: 10px;
  background: var(--dt-surface-solid);
  color: var(--dt-text);
  padding: 7px 10px;
  box-sizing: border-box;
}

/* 运行模式：label + 两个按钮单行 */
.redis-mode-inline-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

/* KEYS / ARGV 数组输入：标题 + 操作按钮单行 */
.redis-array-header {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: nowrap;
}

.redis-array-input {
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid var(--dt-border-strong);
  border-radius: 10px;
  background: var(--dt-surface-solid);
  color: var(--dt-text);
  padding: 7px 10px;
  box-sizing: border-box;
}

.redis-array-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.redis-parsed-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.redis-parsed-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 0;
}

.redis-parsed-index {
  flex: 0 0 80px;
  text-align: right;
  color: var(--dt-text-secondary);
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.redis-parsed-edit {
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid var(--dt-border-strong);
  border-radius: 6px;
  background: var(--dt-surface-solid);
  color: var(--dt-text);
  padding: 5px 8px;
  box-sizing: border-box;
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.redis-debug-block {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--dt-divider);
}

.redis-debug-block:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.redis-debug-block-header h3 {
  margin: 0;
}

.redis-log-card {
  padding: 14px;
  border: 1px solid var(--dt-divider);
  border-radius: 16px;
  background: var(--dt-surface);
}

.redis-log-card pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--dt-text);
}

/* redis.call 轨迹表格 */
.redis-trace-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.redis-trace-table th,
.redis-trace-table td {
  padding: 6px 8px;
  border: 1px solid var(--dt-divider);
  text-align: left;
  vertical-align: top;
}

.redis-trace-table th {
  color: var(--dt-text-secondary);
  background: var(--dt-surface);
  font-weight: 600;
  white-space: nowrap;
}

.redis-trace-table td pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--dt-text);
  font-size: 12px;
}

.redis-trace-error {
  color: var(--dt-danger-soft);
}

.tool-card-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.tool-card {
  padding: 18px;
  border: 1px solid var(--dt-divider);
  background: var(--dt-surface);
  color: inherit;
  text-align: left;
}

.tool-category,
.mini-badge {
  display: inline-flex;
  width: fit-content;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: var(--dt-primary-bg);
  color: var(--dt-primary);
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
  border: 1px solid var(--dt-divider);
  border-radius: 999px;
  background: var(--dt-surface);
  color: var(--dt-text);
}

.tag-chip.favorite {
  border-color: var(--dt-primary-border);
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

.workspace-view--left-center {
  grid-template-columns: var(--workspace-sidebar-width, 280px) var(--workspace-divider-size) minmax(0, 1fr);
}

.workspace-view--all {
  grid-template-columns:
    var(--workspace-sidebar-width, 280px)
    var(--workspace-divider-size)
    minmax(0, 1fr)
    var(--workspace-divider-size)
    var(--workspace-inspector-width, 320px);
}

.workspace-view--center-right {
  grid-template-columns: minmax(0, 1fr) var(--workspace-divider-size) var(--workspace-inspector-width, 320px);
}

.workspace-view--center {
  grid-template-columns: minmax(0, 1fr);
}

.sidebar {
  display: flex;
  flex-direction: column;
  padding: 14px;
  min-height: 720px;
  min-width: 0;
  overflow: hidden;
  transition: width 0.3s ease;
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
  background: var(--dt-surface-strong);
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
  background: var(--dt-surface-strong);
  backdrop-filter: blur(18px);
}

.sidebar-header h2 {
  margin: 0;
}

.sidebar-scroll {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow-y: auto;
}

/* 滚动条默认不显示，hover 时才淡入显示，左右面板行为一致 */
.sidebar-scroll,
.inspector {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  transition: scrollbar-color 0.2s ease;
}

.sidebar-scroll:hover,
.inspector:hover {
  scrollbar-color: var(--dt-text-muted) transparent;
}

.sidebar-scroll::-webkit-scrollbar,
.inspector::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.sidebar-scroll::-webkit-scrollbar-track,
.inspector::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb,
.inspector::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: content-box;
  transition: background-color 0.2s ease;
}

.sidebar-scroll:hover::-webkit-scrollbar-thumb,
.inspector:hover::-webkit-scrollbar-thumb {
  background-color: var(--dt-text-muted);
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
  background: var(--dt-border);
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
  background: var(--dt-primary);
  box-shadow: 0 0 0 3px var(--dt-primary-glow);
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
  color: var(--dt-primary);
}

.tool-group-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--dt-text-muted);
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
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.tool-nav:hover {
  border-color: var(--dt-border);
  background: var(--dt-surface-hover);
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
  border-color: transparent;
  background: var(--dt-primary-bg);
  font-weight: 600;
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
  color: var(--dt-gold);
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
  padding: 6px 22px;
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
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  min-height: 38px;
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

.redis-action-bar {
  margin-top: 0;
  margin-bottom: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--dt-surface);
  border: 1px solid var(--dt-divider);
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
  border: 1px solid var(--dt-border-strong);
  border-radius: 12px;
  background: var(--dt-surface-solid);
  color: var(--dt-text);
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
  border: 1px solid var(--dt-border-strong);
  border-radius: 12px;
  background: var(--dt-surface-strong);
  box-shadow: var(--dt-shadow-overlay);
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
  border-color: var(--dt-primary-border);
  background: var(--dt-primary-bg);
  color: var(--dt-primary);
}

.toggle-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--dt-text-secondary);
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
  border: 1px solid var(--dt-divider);
  border-radius: 16px;
  overflow: hidden;
  background: var(--dt-surface-solid);
}

.code-editor-shell .cm-editor {
  height: 100%;
  min-height: 0;
  background: transparent;
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
  border: 1px solid var(--dt-divider);
  border-radius: 16px;
  background: var(--dt-surface);
  overflow: auto;
}

.output-preview > pre,
.output-preview > strong {
  padding: 18px;
}

.json-tree-view {
  --vjs-font-family:
    "SFMono-Regular", SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, monospace;
  --vjs-background-color: transparent;
  color: var(--dt-text);
  padding: 10px 2px;
  border-radius: 12px;
  background: transparent;
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
  color: var(--dt-text);
  text-align: left;
  font-weight: 700;
}

.inspector-body {
  margin-top: 12px;
}

.bullet-list {
  padding-left: 18px;
  color: var(--dt-text);
}

.bullet-list li + li {
  margin-top: 8px;
}

.preset-stack {
  grid-template-columns: 1fr;
}

.preset-card {
  padding: 14px;
  background: var(--dt-surface);
}

.preset-card code {
  display: block;
  margin-top: 8px;
  color: var(--dt-primary);
}

.history-list {
  display: grid;
  gap: 12px;
}

.history-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--dt-divider);
  border-radius: 16px;
  background: var(--dt-surface);
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
  font-weight: normal;
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
  color: var(--dt-text-muted);
  font-size: 0.83rem;
}

.history-inline-action {
  padding: 4px;
  border: 0;
  background: transparent;
  color: var(--dt-danger);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.history-inline-action:hover {
  background: var(--dt-danger-soft);
  color: var(--dt-surface-solid);
}

.history-empty {
  margin: 0;
  color: var(--dt-text-muted);
}

.ghost-button.small.danger {
  color: var(--dt-danger-soft);
}

@media (max-width: 1280px) {
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
}

@media (max-width: 960px) {
  .topbar,
  .hero,
  .home-grid,
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
