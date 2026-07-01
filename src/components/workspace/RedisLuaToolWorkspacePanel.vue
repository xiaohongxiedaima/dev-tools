<script setup lang="ts">
import { computed, ref } from "vue";
import { useWorkspaceStore } from "../../stores/workspace";
import CodeEditor from "./CodeEditor.vue";
import WorkspaceActionRow from "./WorkspaceActionRow.vue";
import type { WorkspaceActionItem } from "./WorkspaceActionRow.vue";
import { useWorkspacePanelSearch } from "./useWorkspacePanelSearch";
import { useWorkspaceSplitPanels } from "./useWorkspaceSplitPanels";

const workspaceStore = useWorkspaceStore();
const inputEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null);
const outputEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null);
const copyFeedback = ref<"idle" | "success" | "error">("idle");
const copyButtonLabel = computed(() => {
  if (copyFeedback.value === "success") {
    return "已复制";
  }
  if (copyFeedback.value === "error") {
    return "复制失败";
  }
  return "复制";
});
const redisLuaTrace = computed(() => workspaceStore.redisLuaLastResponse?.trace ?? []);
const redisLuaLogs = computed(() => workspaceStore.redisLuaLastResponse?.logs ?? []);
const redisLuaStatusLabel = computed(() => {
  if (workspaceStore.redisLuaIsRunning) {
    return "执行中";
  }

  if (!workspaceStore.redisLuaLastResponse) {
    return "等待执行";
  }

  return workspaceStore.redisLuaLastResponse.success ? "执行成功" : "执行失败";
});
const redisLuaModeLabel = computed(() =>
  workspaceStore.redisLuaExecutionMode === "proxy" ? "本地代理调试" : "真实 EVAL 校验",
);
const inputPrimaryActionItems = computed((): WorkspaceActionItem[] => [
  {
    key: "run",
    label: workspaceStore.redisLuaIsRunning ? "执行中..." : "执行调试",
    variant: "primary",
    disabled: workspaceStore.redisLuaIsRunning,
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
const outputActionItems = computed((): WorkspaceActionItem[] => [
  {
    key: "output-lines",
    label: "行号",
    active: workspaceStore.outputShowLineNumbers,
    pressed: workspaceStore.outputShowLineNumbers,
    onClick: () => {
      workspaceStore.outputShowLineNumbers = !workspaceStore.outputShowLineNumbers;
    },
  },
  {
    key: "output-wrap",
    label: "换行",
    active: workspaceStore.outputSoftWrap,
    pressed: workspaceStore.outputSoftWrap,
    onClick: () => {
      workspaceStore.outputSoftWrap = !workspaceStore.outputSoftWrap;
    },
  },
  {
    key: "copy",
    label: copyButtonLabel.value,
    onClick: () => void copyOutput(),
  },
]);
const { workspacePanelsRef, inputPanelStyle, outputPanelStyle, nudgePanelResize, startPanelResize } =
  useWorkspaceSplitPanels();
const {
  inputContentRef,
  outputContentRef,
  inputSearchInputRef,
  outputSearchInputRef,
  inputSearchQuery,
  outputSearchQuery,
  inputSearchVisible,
  outputSearchVisible,
  searchInputNext,
  searchInputPrevious,
  searchOutputNext,
  searchOutputPrevious,
  hideSearch,
} = useWorkspacePanelSearch({
  inputEditorRef,
  outputEditorRef,
});

async function copyOutput() {
  try {
    await navigator.clipboard.writeText(workspaceStore.outputPreview);
    copyFeedback.value = "success";
  } catch {
    copyFeedback.value = "error";
  }

  window.setTimeout(() => {
    copyFeedback.value = "idle";
  }, 1800);
}

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
          <h2>Lua 脚本</h2>
          <div class="workspace-action-bar">
            <div class="workspace-action-bar-left">
              <WorkspaceActionRow :items="inputPrimaryActionItems" />
            </div>
            <div class="workspace-action-bar-right">
              <WorkspaceActionRow :items="inputSecondaryActionItems" />
            </div>
          </div>
          <div class="redis-config-grid">
            <label class="redis-config-field redis-config-field--full">
              <span>Redis 地址</span>
              <input
                :value="workspaceStore.redisLuaRedisUrl"
                type="text"
                placeholder="redis://127.0.0.1:6379/0"
                @input="workspaceStore.setRedisLuaRedisUrl(($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="redis-config-field redis-config-field--full">
              <span>运行模式</span>
              <div class="redis-mode-row">
                <button
                  class="ghost-button small"
                  type="button"
                  :class="{ 'json-action-active': workspaceStore.redisLuaExecutionMode === 'proxy' }"
                  @click="workspaceStore.setRedisLuaExecutionMode('proxy')"
                >
                  本地代理调试
                </button>
                <button
                  class="ghost-button small"
                  type="button"
                  :class="{ 'json-action-active': workspaceStore.redisLuaExecutionMode === 'eval' }"
                  @click="workspaceStore.setRedisLuaExecutionMode('eval')"
                >
                  真实 EVAL 校验
                </button>
              </div>
            </label>
            <label class="redis-config-field">
              <span>KEYS（JSON 数组）</span>
              <textarea
                :value="workspaceStore.redisLuaKeysText"
                rows="4"
                placeholder='["demo:key"]'
                @input="workspaceStore.setRedisLuaKeysText(($event.target as HTMLTextAreaElement).value)"
              />
            </label>
            <label class="redis-config-field">
              <span>ARGV（JSON 数组）</span>
              <textarea
                :value="workspaceStore.redisLuaArgvText"
                rows="4"
                placeholder='["demo-value"]'
                @input="workspaceStore.setRedisLuaArgvText(($event.target as HTMLTextAreaElement).value)"
              />
            </label>
          </div>
        </div>
        <div class="panel-header-tools" />
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
          <h2>调试结果</h2>
          <div class="workspace-action-bar">
            <div class="workspace-action-bar-left" />
            <div class="workspace-action-bar-right">
              <WorkspaceActionRow :items="outputActionItems" />
            </div>
          </div>
          <div class="redis-summary-row">
            <span class="mini-badge">{{ redisLuaStatusLabel }}</span>
            <span>{{ redisLuaModeLabel }}</span>
            <span>redis.call 轨迹：{{ redisLuaTrace.length }} 条</span>
            <span>脚本日志：{{ redisLuaLogs.length }} 条</span>
          </div>
        </div>
        <div class="panel-header-tools" />
      </div>

      <div ref="outputContentRef" class="output-preview">
        <div v-if="outputSearchVisible" class="editor-search-overlay">
          <div class="editor-search-row editor-search-row--overlay">
            <input
              id="output-search-query"
              ref="outputSearchInputRef"
              v-model="outputSearchQuery"
              type="text"
              placeholder="搜索右侧内容"
              @keydown.enter.prevent="searchOutputNext"
              @keydown.escape.prevent="hideSearch('output')"
            />
            <button class="ghost-button small" type="button" @click="searchOutputPrevious">上一个</button>
            <button class="ghost-button small" type="button" @click="searchOutputNext">下一个</button>
          </div>
        </div>
        <CodeEditor
          ref="outputEditorRef"
          :model-value="workspaceStore.outputPreview"
          :language="'json'"
          :readonly="true"
          :show-line-numbers="workspaceStore.outputShowLineNumbers"
          :wrap="workspaceStore.outputSoftWrap"
        />
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
        <article v-for="entry in redisLuaTrace" :key="entry.index" class="redis-trace-card">
          <div class="redis-trace-top-row">
            <strong>#{{ entry.index }} {{ entry.command }}</strong>
            <span>{{ entry.durationMs.toFixed(2) }} ms</span>
          </div>
          <p class="redis-trace-args">参数：{{ entry.args.join(", ") || "无" }}</p>
          <pre v-if="entry.replyPreview">{{ entry.replyPreview }}</pre>
          <p v-if="entry.error" class="redis-trace-error">{{ entry.error }}</p>
        </article>
      </section>
    </article>
  </section>
</template>
