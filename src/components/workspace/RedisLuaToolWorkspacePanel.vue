<script setup lang="ts">
import { computed, ref } from "vue";
import { List, MoreVertical, Pencil, Plus, Trash2, WrapText, X, ZoomIn, ZoomOut } from "lucide-vue-next";
import { useWorkspaceStore } from "../../stores/workspace";
import { useRedisLuaStore } from "../../stores/redisLua";
import { parseRedisLuaArrayInput } from "../../lib/redis-lua-debug";
import CodeEditor from "./CodeEditor.vue";
import WorkspaceActionRow from "./WorkspaceActionRow.vue";
import type { WorkspaceActionItem } from "./WorkspaceActionRow.vue";
import { useWorkspacePanelSearch } from "./useWorkspacePanelSearch";
import { useWorkspaceSplitPanels } from "./useWorkspaceSplitPanels";

const workspaceStore = useWorkspaceStore();
const redisLuaStore = useRedisLuaStore();
const inputEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null);
const outputEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null);
const redisLuaTrace = computed(() => redisLuaStore.redisLuaLastResponse?.trace ?? []);
const redisLuaLogs = computed(() => redisLuaStore.redisLuaLastResponse?.logs ?? []);

const redisLuaStatusKind = computed<"idle" | "running" | "success" | "error">(() => {
  if (redisLuaStore.redisLuaIsRunning) {
    return "running";
  }
  if (!redisLuaStore.redisLuaLastResponse) {
    return "idle";
  }
  return redisLuaStore.redisLuaLastResponse.success ? "success" : "error";
});

const redisLuaModeLabel = computed(() =>
  redisLuaStore.redisLuaExecutionMode === "proxy" ? "本地代理调试" : "真实 EVAL 校验",
);

// 执行耗时汇总（trace 总耗时）
const redisLuaTotalDuration = computed(() => {
  const trace = redisLuaStore.redisLuaLastResponse?.trace;
  if (!trace || trace.length === 0) {
    return null;
  }
  return trace.reduce((sum, entry) => sum + entry.durationMs, 0);
});

const redisLuaResultIsJson = computed(() => {
  if (!redisLuaStore.redisLuaLastResponse?.resultPreview) {
    return false;
  }
  const preview = redisLuaStore.redisLuaLastResponse.resultPreview.trim();
  // 检测是否为 JSON 格式（以 { 或 [ 开头）
  return (preview.startsWith("{") && preview.endsWith("}")) || (preview.startsWith("[") && preview.endsWith("]"));
});

const redisLuaFormattedResult = computed(() => {
  if (!redisLuaStore.redisLuaLastResponse?.resultPreview) {
    return "";
  }
  if (redisLuaResultIsJson.value) {
    try {
      // 格式化 JSON
      const parsed = JSON.parse(redisLuaStore.redisLuaLastResponse.resultPreview);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // 解析失败返回原始内容
      return redisLuaStore.redisLuaLastResponse.resultPreview;
    }
  }
  return redisLuaStore.redisLuaLastResponse.resultPreview;
});

// KEYS / ARGV 项列表（本地源，支持空项编辑）
const keysItems = ref<string[]>(parseRedisLuaArrayInput(redisLuaStore.redisLuaKeysText, "KEYS"));
const argvItems = ref<string[]>(parseRedisLuaArrayInput(redisLuaStore.redisLuaArgvText, "ARGV"));

function onKeysTextInput(event: Event) {
  const text = (event.target as HTMLInputElement).value;
  redisLuaStore.setRedisLuaKeysText(text);
  keysItems.value = parseRedisLuaArrayInput(text, "KEYS");
}

function updateKeyItem(index: number, value: string) {
  keysItems.value = keysItems.value.map((item, i) => (i === index ? value : item));
  redisLuaStore.setRedisLuaKeysText(keysItems.value.join(" "));
}

function appendKey() {
  keysItems.value = [...keysItems.value, ""];
  redisLuaStore.setRedisLuaKeysText(keysItems.value.join(" "));
}

function removeKeyAt(index: number) {
  keysItems.value = keysItems.value.filter((_, i) => i !== index);
  redisLuaStore.setRedisLuaKeysText(keysItems.value.join(" "));
}

function onArgvTextInput(event: Event) {
  const text = (event.target as HTMLInputElement).value;
  redisLuaStore.setRedisLuaArgvText(text);
  argvItems.value = parseRedisLuaArrayInput(text, "ARGV");
}

function updateArgvItem(index: number, value: string) {
  argvItems.value = argvItems.value.map((item, i) => (i === index ? value : item));
  redisLuaStore.setRedisLuaArgvText(argvItems.value.join(" "));
}

function appendArgv() {
  argvItems.value = [...argvItems.value, ""];
  redisLuaStore.setRedisLuaArgvText(argvItems.value.join(" "));
}

function removeArgvAt(index: number) {
  argvItems.value = argvItems.value.filter((_, i) => i !== index);
  redisLuaStore.setRedisLuaArgvText(argvItems.value.join(" "));
}

// Redis 地址管理：新增 / 编辑态
const addressDraftMode = ref<"idle" | "add" | "edit">("idle");
const addressDraftId = ref<string>("");
const addressDraftLabel = ref("");
const addressDraftUrl = ref("");
const selectedAddressId = computed(() => {
  const current = redisLuaStore.redisLuaRedisUrl;
  const match = redisLuaStore.redisLuaSavedAddresses.find((entry) => entry.url === current);
  return match?.id ?? "";
});

// 地址操作折叠菜单
const addressMenuOpen = ref(false);

function toggleAddressMenu() {
  addressMenuOpen.value = !addressMenuOpen.value;
}

function closeAddressMenu() {
  addressMenuOpen.value = false;
}

function addressMenuAdd() {
  closeAddressMenu();
  startAddAddress();
}

function addressMenuEdit() {
  closeAddressMenu();
  if (selectedAddressId.value) {
    startEditAddress(selectedAddressId.value);
  }
}

function addressMenuDelete() {
  closeAddressMenu();
  if (selectedAddressId.value) {
    redisLuaStore.deleteRedisLuaSavedAddress(selectedAddressId.value);
  }
}

function startAddAddress() {
  addressDraftMode.value = "add";
  addressDraftId.value = "";
  addressDraftLabel.value = "";
  addressDraftUrl.value = redisLuaStore.redisLuaRedisUrl;
}

function startEditAddress(id: string) {
  const target = redisLuaStore.redisLuaSavedAddresses.find((entry) => entry.id === id);
  if (!target) {
    return;
  }
  addressDraftMode.value = "edit";
  addressDraftId.value = id;
  addressDraftLabel.value = target.label;
  addressDraftUrl.value = target.url;
}

function cancelAddressDraft() {
  addressDraftMode.value = "idle";
  addressDraftId.value = "";
  addressDraftLabel.value = "";
  addressDraftUrl.value = "";
}

function confirmAddressDraft() {
  const label = addressDraftLabel.value;
  const url = addressDraftUrl.value;
  if (!url.trim()) {
    return;
  }
  if (addressDraftMode.value === "edit" && addressDraftId.value) {
    redisLuaStore.updateRedisLuaSavedAddress(addressDraftId.value, label, url);
  } else {
    redisLuaStore.addRedisLuaSavedAddress(label, url);
  }
  cancelAddressDraft();
}

function onAddressSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (value) {
    redisLuaStore.selectRedisLuaSavedAddress(value);
  }
}

const inputPrimaryActionItems = computed((): WorkspaceActionItem[] => [
  {
    key: "run",
    label: redisLuaStore.redisLuaIsRunning ? "执行中..." : "执行调试",
    variant: "primary",
    disabled: redisLuaStore.redisLuaIsRunning,
    onClick: () => void runActiveTool(),
  },
]);
const inputSecondaryActionItems = computed((): WorkspaceActionItem[] => [
  {
    key: "input-lines",
    label: "行号",
    icon: List,
    active: workspaceStore.inputShowLineNumbers,
    pressed: workspaceStore.inputShowLineNumbers,
    onClick: () => {
      workspaceStore.inputShowLineNumbers = !workspaceStore.inputShowLineNumbers;
    },
  },
  {
    key: "input-wrap",
    label: "换行",
    icon: WrapText,
    active: workspaceStore.inputSoftWrap,
    pressed: workspaceStore.inputSoftWrap,
    onClick: () => {
      workspaceStore.inputSoftWrap = !workspaceStore.inputSoftWrap;
    },
  },
  {
    key: "font-zoom-in",
    label: "放大字体",
    icon: ZoomIn,
    onClick: () => workspaceStore.zoomEditorFont("input", 1),
  },
  {
    key: "font-zoom-out",
    label: "缩小字体",
    icon: ZoomOut,
    onClick: () => workspaceStore.zoomEditorFont("input", -1),
  },
]);
const { workspacePanelsRef, inputPanelStyle, outputPanelStyle, nudgePanelResize, startPanelResize } =
  useWorkspaceSplitPanels();
const {
  inputContentRef,
  inputSearchInputRef,
  inputSearchQuery,
  inputSearchVisible,
  searchInputNext,
  searchInputPrevious,
  hideSearch,
} = useWorkspacePanelSearch({
  inputEditorRef,
  outputEditorRef,
});

async function runActiveTool() {
  try {
    await workspaceStore.runCurrentTransform();
  } catch (error) {
    workspaceStore.errorMessage = error instanceof Error ? error.message : String(error);
  }
}
</script>

<template>
  <section ref="workspacePanelsRef" class="workspace-panels">
    <article class="editor-panel shell-card" :style="inputPanelStyle">
      <div class="workspace-action-bar redis-action-bar">
        <div class="workspace-action-bar-left">
          <WorkspaceActionRow :items="inputPrimaryActionItems" />
        </div>
        <div class="workspace-action-bar-right">
          <WorkspaceActionRow :items="inputSecondaryActionItems" grouped />
        </div>
      </div>

      <div ref="inputContentRef" class="editor-content-shell">
        <div v-if="inputSearchVisible" class="editor-search-overlay">
          <div class="editor-search-row editor-search-row--overlay">
            <input
              id="input-search-query"
              ref="inputSearchInputRef"
              v-model="inputSearchQuery"
              type="text"
              placeholder="搜索左侧内容"
              @keydown.enter.prevent="searchInputNext"
              @keydown.escape.prevent="hideSearch('input')"
            />
            <button class="ghost-button small" type="button" @click="searchInputPrevious">上一个</button>
            <button class="ghost-button small" type="button" @click="searchInputNext">下一个</button>
          </div>
        </div>
        <CodeEditor
          ref="inputEditorRef"
          :model-value="workspaceStore.inputValue"
          :language="'lua'"
          :placeholder="workspaceStore.activeTool.placeholder"
          :show-line-numbers="workspaceStore.inputShowLineNumbers"
          :wrap="workspaceStore.inputSoftWrap"
          :font-size="workspaceStore.inputFontSize"
          @update:model-value="workspaceStore.setInputValue"
          @blur="workspaceStore.saveAutoHistoryOnInputBlur"
        />
      </div>
    </article>

    <div
      class="workspace-panel-resize-handle"
      role="separator"
      aria-label="调整左右面板宽度"
      tabindex="0"
      @pointerdown="startPanelResize"
      @keydown.left.prevent="nudgePanelResize(-5)"
      @keydown.right.prevent="nudgePanelResize(5)"
    />

    <article class="editor-panel shell-card" :style="outputPanelStyle">
      <div class="panel-header compact">
        <div class="panel-header-copy">
          <div class="redis-config-grid">
            <div class="redis-config-field redis-config-field--full redis-address-field">
              <div class="redis-address-row">
                <span class="redis-field-label">Redis 地址</span>
                <div class="redis-address-select-shell">
                  <select
                    class="redis-address-select"
                    :value="selectedAddressId"
                    aria-label="选择已保存的 Redis 地址"
                    @change="onAddressSelect"
                  >
                    <option value="" disabled>选择地址…</option>
                    <option v-for="entry in redisLuaStore.redisLuaSavedAddresses" :key="entry.id" :value="entry.id">
                      {{ entry.label }} — {{ entry.url }}
                    </option>
                  </select>
                </div>
                <div class="redis-address-menu">
                  <button
                    class="ghost-button small redis-tight-btn icon-only"
                    type="button"
                    title="地址操作"
                    @click="toggleAddressMenu"
                  >
                    <MoreVertical :size="14" />
                  </button>
                  <div v-if="addressMenuOpen" class="redis-address-menu-popover">
                    <button class="redis-address-menu-item" type="button" @click="addressMenuAdd">
                      <Plus :size="14" />
                      <span>新增</span>
                    </button>
                    <button
                      class="redis-address-menu-item"
                      type="button"
                      :disabled="!selectedAddressId"
                      @click="addressMenuEdit"
                    >
                      <Pencil :size="14" />
                      <span>编辑</span>
                    </button>
                    <button
                      class="redis-address-menu-item"
                      type="button"
                      :disabled="!selectedAddressId"
                      @click="addressMenuDelete"
                    >
                      <Trash2 :size="14" />
                      <span>删除</span>
                    </button>
                  </div>
                  <div v-if="addressMenuOpen" class="redis-address-menu-backdrop" @click="closeAddressMenu" />
                </div>
              </div>
              <div v-if="addressDraftMode !== 'idle'" class="redis-address-draft">
                <input
                  v-model="addressDraftLabel"
                  type="text"
                  placeholder="地址备注（如 本地 Redis）"
                />
                <input
                  v-model="addressDraftUrl"
                  type="text"
                  placeholder="redis://127.0.0.1:6379/0"
                />
                <button class="primary-button small redis-tight-btn" type="button" @click="confirmAddressDraft">保存</button>
                <button class="ghost-button small redis-tight-btn icon-only" type="button" @click="cancelAddressDraft">
                  <X :size="14" />
                </button>
              </div>
            </div>

            <div class="redis-config-field redis-config-field--full">
              <div class="redis-mode-inline-row">
                <span class="redis-field-label">运行模式</span>
                <button
                  class="ghost-button small redis-tight-btn"
                  type="button"
                  :class="{ 'json-action-active': redisLuaStore.redisLuaExecutionMode === 'proxy' }"
                  @click="redisLuaStore.setRedisLuaExecutionMode('proxy')"
                >
                  本地代理调试
                </button>
                <button
                  class="ghost-button small redis-tight-btn"
                  type="button"
                  :class="{ 'json-action-active': redisLuaStore.redisLuaExecutionMode === 'eval' }"
                  @click="redisLuaStore.setRedisLuaExecutionMode('eval')"
                >
                  真实 EVAL 校验
                </button>
              </div>
            </div>

            <div class="redis-config-field redis-config-field--full">
              <div class="redis-array-header">
                <span class="redis-field-label">KEYS</span>
                <input
                  class="redis-array-input"
                  :value="redisLuaStore.redisLuaKeysText"
                  type="text"
                  placeholder="KEYS[1]  KEYS[2]  ..."
                  @input="onKeysTextInput"
                />
                <div class="redis-array-actions">
                  <button class="ghost-button small redis-tight-btn icon-only" type="button" title="新增" @click="appendKey">
                    <Plus :size="14" />
                  </button>
                </div>
              </div>
              <div v-if="keysItems.length > 0" class="redis-parsed-list">
                <div v-for="(item, index) in keysItems" :key="`keys-${index}`" class="redis-parsed-item">
                  <span class="redis-parsed-index">KEYS[{{ index + 1 }}]</span>
                  <input
                    class="redis-parsed-edit"
                    :value="item"
                    type="text"
                    :placeholder="`KEYS[${index + 1}] 值`"
                    @input="updateKeyItem(index, ($event.target as HTMLInputElement).value)"
                  />
                  <button class="ghost-button small redis-tight-btn icon-only" type="button" title="删除" @click="removeKeyAt(index)">
                    <X :size="12" />
                  </button>
                </div>
              </div>
            </div>

            <div class="redis-config-field redis-config-field--full">
              <div class="redis-array-header">
                <span class="redis-field-label">ARGV</span>
                <input
                  class="redis-array-input"
                  :value="redisLuaStore.redisLuaArgvText"
                  type="text"
                  placeholder="ARGV[1]  ARGV[2]  ..."
                  @input="onArgvTextInput"
                />
                <div class="redis-array-actions">
                  <button class="ghost-button small redis-tight-btn icon-only" type="button" title="新增" @click="appendArgv">
                    <Plus :size="14" />
                  </button>
                </div>
              </div>
              <div v-if="argvItems.length > 0" class="redis-parsed-list">
                <div v-for="(item, index) in argvItems" :key="`argv-${index}`" class="redis-parsed-item">
                  <span class="redis-parsed-index">ARGV[{{ index + 1 }}]</span>
                  <input
                    class="redis-parsed-edit"
                    :value="item"
                    type="text"
                    :placeholder="`ARGV[${index + 1}] 值`"
                    @input="updateArgvItem(index, ($event.target as HTMLInputElement).value)"
                  />
                  <button class="ghost-button small redis-tight-btn icon-only" type="button" title="删除" @click="removeArgvAt(index)">
                    <X :size="12" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section class="redis-debug-block redis-status-block">
        <div class="redis-execution-card" :class="`redis-execution-card--${redisLuaStatusKind}`">
          <div class="redis-execution-card-header">
            <span class="redis-status-badge" :class="`redis-status-badge--${redisLuaStatusKind}`">
              <span v-if="redisLuaStatusKind === 'running'" class="redis-status-spinner" />
            </span>
            <span v-if="redisLuaStore.redisLuaLastResponse" class="redis-execution-mode">{{ redisLuaModeLabel }}</span>
            <div v-if="redisLuaStore.redisLuaLastResponse" class="redis-execution-stats">
              <span v-if="redisLuaTotalDuration !== null" class="redis-stat">
                <span class="redis-stat-label">总耗时</span>
                <span class="redis-stat-value">{{ redisLuaTotalDuration.toFixed(2) }} ms</span>
              </span>
              <span class="redis-stat">
                <span class="redis-stat-label">调用</span>
                <span class="redis-stat-value">{{ redisLuaTrace.length }}</span>
              </span>
              <span class="redis-stat">
                <span class="redis-stat-label">日志</span>
                <span class="redis-stat-value">{{ redisLuaLogs.length }}</span>
              </span>
            </div>
          </div>

          <div v-if="redisLuaStatusKind === 'idle'" class="redis-execution-empty">
            点击「执行调试」运行 Lua 脚本
          </div>

          <div v-if="redisLuaStore.redisLuaLastResponse && !redisLuaStore.redisLuaLastResponse.success" class="redis-execution-error">
            <strong>错误信息</strong>
            <pre>{{ redisLuaStore.redisLuaLastResponse.error ?? "执行失败" }}</pre>
          </div>

          <div v-else-if="redisLuaStore.redisLuaLastResponse?.resultPreview" class="redis-execution-result">
            <div class="redis-execution-result-label">
              {{ redisLuaResultIsJson ? "返回值（JSON）" : "返回值" }}
            </div>
            <pre class="redis-result-preview" :class="{ 'redis-result-json': redisLuaResultIsJson }">{{ redisLuaFormattedResult }}</pre>
          </div>
        </div>
      </section>

      <section v-if="redisLuaTrace.length > 0" class="redis-debug-block">
        <div class="redis-debug-block-header">
          <h3>Trace ({{ redisLuaTrace.length }})</h3>
        </div>
        <table class="redis-trace-table">
          <thead>
            <tr>
              <th>#</th>
              <th class="redis-trace-line">行号</th>
              <th>命令</th>
              <th>key</th>
              <th>参数</th>
              <th>结果</th>
              <th class="redis-trace-duration">耗时(ms)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in redisLuaTrace" :key="entry.index">
              <td>{{ entry.index }}</td>
              <td class="redis-trace-line">{{ entry.sourceLine ?? "-" }}</td>
              <td>{{ entry.command }}</td>
              <td>{{ entry.args[0] ?? "-" }}</td>
              <td>{{ entry.args.slice(1).join(", ") || "-" }}</td>
              <td>
                <pre v-if="entry.replyPreview">{{ entry.replyPreview }}</pre>
                <span v-else-if="entry.error" class="redis-trace-error">{{ entry.error }}</span>
                <span v-else>-</span>
              </td>
              <td class="redis-trace-duration">{{ entry.durationMs.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="redisLuaLogs.length > 0" class="redis-debug-block">
        <div class="redis-debug-block-header">
          <h3>脚本日志 ({{ redisLuaLogs.length }})</h3>
        </div>
        <article v-for="(entry, index) in redisLuaLogs" :key="`${entry.level}-${index}`" class="redis-log-card">
          <strong>{{ entry.level }}</strong>
          <pre>{{ entry.message }}</pre>
        </article>
      </section>
    </article>
  </section>
</template>

<style scoped>
.redis-debug-block {
  border-bottom: 1px solid var(--color-border);
}

.redis-debug-block-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.redis-debug-block-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

/* —— 执行状态卡片 —— */
.redis-execution-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px;
  background: var(--color-surface);
}

.redis-execution-card--success {
  border-color: rgba(34, 197, 94, 0.4);
}

.redis-execution-card--error {
  border-color: rgba(239, 68, 68, 0.4);
}

.redis-execution-card--running {
  border-color: var(--dt-primary, #7c3aed);
}

.redis-execution-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
}

.redis-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.redis-status-badge--idle {
  background: var(--color-text-secondary);
}

.redis-status-badge--running {
  background: var(--dt-primary, #7c3aed);
}

.redis-status-badge--success {
  background: rgb(22, 163, 74);
}

.redis-status-badge--error {
  background: rgb(220, 38, 38);
}

.redis-status-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: redis-spin 0.6s linear infinite;
}

@keyframes redis-spin {
  to { transform: rotate(360deg); }
}

.redis-execution-mode {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.redis-execution-stats {
  display: flex;
  gap: 20px;
  margin-left: auto;
  flex-wrap: nowrap;
}

.redis-stat {
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
}

.redis-stat-label {
  font-size: 11px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.redis-stat-value {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.redis-execution-empty {
  margin-top: 10px;
  padding: 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: center;
}

.redis-execution-error {
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.redis-execution-error strong {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: rgb(220, 38, 38);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.redis-execution-error pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: rgb(185, 28, 28);
}

.redis-execution-result {
  margin-top: 12px;
}

.redis-execution-result-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.redis-result-preview {
  margin: 0;
  padding: 12px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
  background: var(--color-surface-secondary);
  border: 1px solid var(--color-border);
}

.redis-result-json {
  background: var(--color-syntax-background);
  border-color: var(--color-border);
}

.redis-trace-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.redis-trace-table th,
.redis-trace-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.redis-trace-table th {
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--dt-surface-strong, var(--color-surface-secondary));
  position: sticky;
  top: 0;
  z-index: 1;
}

.redis-trace-duration {
  width: 80px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.redis-trace-line {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
  width: 48px;
  text-align: right;
}

.redis-trace-table td pre {
  margin: 0;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--color-surface-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  max-width: 300px;
}

.redis-trace-error {
  color: var(--color-syntax-keyword);
}

.redis-log-card {
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 8px;
  background: var(--color-surface-secondary);
  border-left: 3px solid var(--color-border);
}

.redis-log-card:last-child {
  margin-bottom: 0;
}

.redis-log-card strong {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.redis-log-card pre {
  margin: 0;
  padding: 8px;
  border-radius: 4px;
  background: var(--color-surface);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
}
</style>

