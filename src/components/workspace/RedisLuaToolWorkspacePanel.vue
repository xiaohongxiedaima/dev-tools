<script setup lang="ts">
import { computed, ref } from "vue";
import { MoreVertical, Pencil, Plus, Trash2, X } from "lucide-vue-next";
import { useWorkspaceStore } from "../../stores/workspace";
import { useRedisLuaStore } from "../../stores/redisLua";
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
const redisLuaStatusLabel = computed(() => {
  if (redisLuaStore.redisLuaIsRunning) {
    return "执行中";
  }

  if (!redisLuaStore.redisLuaLastResponse) {
    return "等待执行";
  }

  return redisLuaStore.redisLuaLastResponse.success ? "执行成功" : "执行失败";
});
const redisLuaModeLabel = computed(() =>
  redisLuaStore.redisLuaExecutionMode === "proxy" ? "本地代理调试" : "真实 EVAL 校验",
);
const redisLuaResultLabel = computed(() => {
  if (redisLuaStore.redisLuaIsRunning || !redisLuaStore.redisLuaLastResponse) {
    return "";
  }
  const response = redisLuaStore.redisLuaLastResponse;
  if (!response.success) {
    return response.error ?? "执行失败";
  }
  return response.resultPreview || "执行成功";
});

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
    active: workspaceStore.inputShowLineNumbers,
    pressed: workspaceStore.inputShowLineNumbers,
    onClick: () => {
      workspaceStore.inputShowLineNumbers = !workspaceStore.inputShowLineNumbers;
    },
  },
  {
    key: "input-wrap",
    label: "换行",
    active: workspaceStore.inputSoftWrap,
    pressed: workspaceStore.inputSoftWrap,
    onClick: () => {
      workspaceStore.inputSoftWrap = !workspaceStore.inputSoftWrap;
    },
  },
  {
    key: "input-clear",
    label: "清空",
    onClick: () => {
      workspaceStore.setInputValue("");
    },
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
                <span class="redis-mode-inline-label">运行模式</span>
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
                <span>KEYS</span>
                <div class="redis-array-mode-toggle">
                  <button
                    class="ghost-button small redis-tight-btn"
                    type="button"
                    :class="{ 'json-action-active': redisLuaStore.redisLuaKeysInputMode === 'json' }"
                    @click="redisLuaStore.setRedisLuaKeysInputMode('json')"
                  >
                    JSON 数组
                  </button>
                  <button
                    class="ghost-button small redis-tight-btn"
                    type="button"
                    :class="{ 'json-action-active': redisLuaStore.redisLuaKeysInputMode === 'items' }"
                    @click="redisLuaStore.setRedisLuaKeysInputMode('items')"
                  >
                    逐项输入
                  </button>
                </div>
              </div>
              <input
                v-if="redisLuaStore.redisLuaKeysInputMode === 'json'"
                :value="redisLuaStore.redisLuaKeysText"
                type="text"
                placeholder='["demo:key"]'
                @input="redisLuaStore.setRedisLuaKeysText(($event.target as HTMLInputElement).value)"
              />
              <div v-else class="redis-items-list">
                <div v-for="(item, index) in redisLuaStore.redisLuaKeysItems" :key="`keys-${index}`" class="redis-item-row">
                  <span class="redis-item-index">KEYS[{{ index + 1 }}]</span>
                  <input
                    :value="item"
                    type="text"
                    :placeholder="`KEYS[${index + 1}] 值`"
                    @input="redisLuaStore.updateRedisLuaKeysItem(index, ($event.target as HTMLInputElement).value)"
                  />
                  <button class="ghost-button small redis-tight-btn icon-only" type="button" title="删除该项" @click="redisLuaStore.removeRedisLuaKeysItem(index)">
                    <X :size="14" />
                  </button>
                </div>
                <button class="ghost-button small redis-tight-btn redis-item-add" type="button" @click="redisLuaStore.addRedisLuaKeysItem">
                  <Plus :size="14" />
                  新增 KEYS 项
                </button>
              </div>
            </div>

            <div class="redis-config-field redis-config-field--full">
              <div class="redis-array-header">
                <span>ARGV</span>
                <div class="redis-array-mode-toggle">
                  <button
                    class="ghost-button small redis-tight-btn"
                    type="button"
                    :class="{ 'json-action-active': redisLuaStore.redisLuaArgvInputMode === 'json' }"
                    @click="redisLuaStore.setRedisLuaArgvInputMode('json')"
                  >
                    JSON 数组
                  </button>
                  <button
                    class="ghost-button small redis-tight-btn"
                    type="button"
                    :class="{ 'json-action-active': redisLuaStore.redisLuaArgvInputMode === 'items' }"
                    @click="redisLuaStore.setRedisLuaArgvInputMode('items')"
                  >
                    逐项输入
                  </button>
                </div>
              </div>
              <input
                v-if="redisLuaStore.redisLuaArgvInputMode === 'json'"
                :value="redisLuaStore.redisLuaArgvText"
                type="text"
                placeholder='["demo-value"]'
                @input="redisLuaStore.setRedisLuaArgvText(($event.target as HTMLInputElement).value)"
              />
              <div v-else class="redis-items-list">
                <div v-for="(item, index) in redisLuaStore.redisLuaArgvItems" :key="`argv-${index}`" class="redis-item-row">
                  <span class="redis-item-index">ARGV[{{ index + 1 }}]</span>
                  <input
                    :value="item"
                    type="text"
                    :placeholder="`ARGV[${index + 1}] 值`"
                    @input="redisLuaStore.updateRedisLuaArgvItem(index, ($event.target as HTMLInputElement).value)"
                  />
                  <button class="ghost-button small redis-tight-btn icon-only" type="button" title="删除该项" @click="redisLuaStore.removeRedisLuaArgvItem(index)">
                    <X :size="14" />
                  </button>
                </div>
                <button class="ghost-button small redis-tight-btn redis-item-add" type="button" @click="redisLuaStore.addRedisLuaArgvItem">
                  <Plus :size="14" />
                  新增 ARGV 项
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="workspace-action-bar redis-action-bar">
        <div class="workspace-action-bar-left">
          <WorkspaceActionRow :items="inputPrimaryActionItems" />
        </div>
        <div class="workspace-action-bar-right">
          <WorkspaceActionRow :items="inputSecondaryActionItems" />
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
          <div class="redis-summary-row">
            <span class="mini-badge">{{ redisLuaStatusLabel }}</span>
            <span>{{ redisLuaModeLabel }}</span>
            <span v-if="redisLuaResultLabel" class="redis-summary-result" :class="{ 'redis-trace-error': !redisLuaStore.redisLuaLastResponse?.success }">{{ redisLuaResultLabel }}</span>
            <span>redis.call 轨迹：{{ redisLuaTrace.length }} 条</span>
            <span>脚本日志：{{ redisLuaLogs.length }} 条</span>
          </div>
        </div>
      </div>

      <section v-if="redisLuaLogs.length > 0" class="redis-debug-block">
        <div class="redis-debug-block-header">
          <h3>脚本日志</h3>
        </div>
        <article v-for="(entry, index) in redisLuaLogs" :key="`${entry.level}-${index}`" class="redis-log-card">
          <strong>{{ entry.level }}</strong>
          <pre>{{ entry.message }}</pre>
        </article>
      </section>
      <section v-if="redisLuaTrace.length > 0" class="redis-debug-block">
        <div class="redis-debug-block-header">
          <h3>redis.call 轨迹</h3>
        </div>
        <table class="redis-trace-table">
          <thead>
            <tr>
              <th>序列</th>
              <th>代码行</th>
              <th>命令</th>
              <th>key</th>
              <th>参数</th>
              <th>结果</th>
              <th>耗时</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in redisLuaTrace" :key="entry.index">
              <td>{{ entry.index }}</td>
              <td>{{ entry.sourceLine ?? "-" }}</td>
              <td>{{ entry.command }}</td>
              <td>{{ entry.args[0] ?? "-" }}</td>
              <td>{{ entry.args.slice(1).join(", ") || "-" }}</td>
              <td>
                <pre v-if="entry.replyPreview">{{ entry.replyPreview }}</pre>
                <span v-else-if="entry.error" class="redis-trace-error">{{ entry.error }}</span>
                <span v-else>-</span>
              </td>
              <td>{{ entry.durationMs.toFixed(2) }} ms</td>
            </tr>
          </tbody>
        </table>
      </section>
    </article>
  </section>
</template>
