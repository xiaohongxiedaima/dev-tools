<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { useWorkspaceStore } from "../../stores/workspace";
import CodeEditor from "./CodeEditor.vue";
import ToolActionBar from "./ToolActionBar.vue";

const workspaceStore = useWorkspaceStore();
const isJsonTool = computed(() => workspaceStore.activeTool.id === "json-formatter");
const isRedisLuaTool = computed(() => workspaceStore.activeTool.id === "redis-lua-debug-console");
const showJsonTree = computed(
  () => isJsonTool.value && workspaceStore.jsonOutputMode === "tree" && workspaceStore.jsonTreeData !== null,
);
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
const inputEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null);
const outputEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null);
const inputContentRef = ref<HTMLElement | null>(null);
const outputContentRef = ref<HTMLElement | null>(null);
const inputSearchInputRef = ref<HTMLInputElement | null>(null);
const outputSearchInputRef = ref<HTMLInputElement | null>(null);
const inputSearchQuery = ref("");
const outputSearchQuery = ref("");
const inputSearchVisible = ref(false);
const outputSearchVisible = ref(false);
const copyFeedback = ref<"idle" | "success" | "error">("idle");
const copyButtonLabel = computed(() => {
  if (copyFeedback.value === "success") {
    return "已复制";
  }
  if (copyFeedback.value === "error") {
    return "复制失败";
  }
  return "复制结果";
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

function searchInputNext() {
  inputEditorRef.value?.findNextMatch(inputSearchQuery.value);
}

function searchInputPrevious() {
  inputEditorRef.value?.findPreviousMatch(inputSearchQuery.value);
}

async function searchOutputNext() {
  if (workspaceStore.jsonOutputMode === "tree") {
    workspaceStore.setJsonOutputMode("text");
    await nextTick();
  }
  outputEditorRef.value?.findNextMatch(outputSearchQuery.value);
}

async function searchOutputPrevious() {
  if (workspaceStore.jsonOutputMode === "tree") {
    workspaceStore.setJsonOutputMode("text");
    await nextTick();
  }
  outputEditorRef.value?.findPreviousMatch(outputSearchQuery.value);
}

function resolvePanelFromTarget(target: EventTarget | null) {
  if (!(target instanceof Node)) {
    return null;
  }

  if (inputContentRef.value?.contains(target) || inputSearchInputRef.value?.contains(target)) {
    return "input";
  }

  if (outputContentRef.value?.contains(target) || outputSearchInputRef.value?.contains(target)) {
    return "output";
  }

  return null;
}

async function toggleSearch(panel: "input" | "output") {
  const nextVisible = panel === "input" ? !inputSearchVisible.value : !outputSearchVisible.value;

  if (panel === "input") {
    inputSearchVisible.value = nextVisible;
    outputSearchVisible.value = false;
  } else {
    outputSearchVisible.value = nextVisible;
    inputSearchVisible.value = false;
  }

  if (!nextVisible) {
    return;
  }

  await nextTick();
  const searchInput = panel === "input" ? inputSearchInputRef.value : outputSearchInputRef.value;
  searchInput?.focus();
  searchInput?.select();
}

function hideSearch(panel: "input" | "output") {
  if (panel === "input") {
    inputSearchVisible.value = false;
    return;
  }

  outputSearchVisible.value = false;
}

function handleSearchShortcut(event: KeyboardEvent) {
  if ((!event.metaKey && !event.ctrlKey) || event.altKey || event.key.toLowerCase() !== "f") {
    return;
  }

  const panel = resolvePanelFromTarget(event.target);
  if (!panel) {
    return;
  }

  event.preventDefault();
  void toggleSearch(panel);
}

onMounted(() => {
  window.addEventListener("keydown", handleSearchShortcut, true);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleSearchShortcut, true);
});
</script>

<template>
  <section class="workspace-main">
    <header class="workspace-header compact shell-card">
      <div>
        <p class="eyebrow">{{ workspaceStore.activeTool.categoryName }}</p>
        <h1>{{ workspaceStore.activeTool.name }}</h1>
      </div>

      <ToolActionBar />
    </header>

    <section class="workspace-panels">
      <article class="editor-panel shell-card">
        <div class="panel-header compact">
          <div class="panel-header-copy">
            <h2>{{ isRedisLuaTool ? "Lua 脚本" : "输入区" }}</h2>
            <div v-if="isJsonTool" class="json-input-header-row">
              <button
                class="ghost-button small"
                type="button"
                :class="{ 'json-action-active': workspaceStore.jsonAction === 'format' }"
                @click="workspaceStore.setJsonAction('format')"
              >
                格式化 JSON
              </button>
              <button
                class="ghost-button small"
                type="button"
                :class="{ 'json-action-active': workspaceStore.jsonAction === 'minify' }"
                @click="workspaceStore.setJsonAction('minify')"
              >
                压缩 JSON
              </button>
              <button
                class="ghost-button small"
                type="button"
                :class="{ 'json-action-active': workspaceStore.jsonAction === 'sort' }"
                @click="workspaceStore.setJsonAction('sort')"
              >
                排序 JSON
              </button>
            </div>
            <div v-if="isRedisLuaTool" class="redis-config-grid">
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
          <div class="panel-header-tools">
            <button
              v-if="!isRedisLuaTool"
              class="ghost-button small"
              :class="{ 'json-action-active': workspaceStore.liveMode }"
              type="button"
              :aria-pressed="workspaceStore.liveMode"
              @click="workspaceStore.setLiveMode(!workspaceStore.liveMode)"
            >
              实时预览
            </button>
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
                placeholder="搜索输入内容"
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
            :language="isJsonTool ? 'json' : 'text'"
            :placeholder="workspaceStore.activeTool.placeholder"
            :show-line-numbers="workspaceStore.showLineNumbers"
            @update:model-value="workspaceStore.setInputValue"
            @blur="workspaceStore.saveAutoHistoryOnInputBlur"
          />
        </div>
      </article>

      <article class="editor-panel shell-card">
        <div class="panel-header">
          <div class="panel-header-copy">
            <h2>{{ isRedisLuaTool ? "调试结果" : "输出区" }}</h2>
            <div class="json-output-action-row">
              <button class="ghost-button small" type="button" @click="copyOutput">{{ copyButtonLabel }}</button>
              <template v-if="isJsonTool">
                <button
                  class="ghost-button small"
                  type="button"
                  :class="{ 'json-action-active': workspaceStore.jsonOutputMode === 'text' }"
                  @click="workspaceStore.setJsonOutputMode('text')"
                >
                  文本视图
                </button>
                <button
                  class="ghost-button small"
                  type="button"
                  :class="{ 'json-action-active': workspaceStore.jsonOutputMode === 'tree' }"
                  @click="workspaceStore.setJsonOutputMode('tree')"
                >
                  树状视图
                </button>
                <template v-if="showJsonTree">
                  <button
                    class="ghost-button small"
                    type="button"
                    @click="workspaceStore.expandJsonTree()"
                  >
                    一键展开
                  </button>
                  <button
                    class="ghost-button small"
                    type="button"
                    @click="workspaceStore.collapseJsonTree()"
                  >
                    一键折叠
                  </button>
                </template>
              </template>
            </div>
            <div v-if="isRedisLuaTool" class="redis-summary-row">
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
                placeholder="搜索输出内容"
                @keydown.enter.prevent="searchOutputNext"
                @keydown.escape.prevent="hideSearch('output')"
              />
              <button class="ghost-button small" type="button" @click="searchOutputPrevious">上一个</button>
              <button class="ghost-button small" type="button" @click="searchOutputNext">下一个</button>
            </div>
          </div>
          <strong v-if="!isJsonTool && !isRedisLuaTool">{{ workspaceStore.activeTool.sampleOutputTitle }}</strong>
          <VueJsonPretty
            v-if="showJsonTree"
            :key="workspaceStore.jsonTreeRenderKey"
            :data="workspaceStore.jsonTreeData"
            :deep="workspaceStore.jsonTreeDepth"
            :collapsed-node-length="workspaceStore.jsonTreeCollapsedNodeLength"
            :collapsed-on-click-brackets="true"
            :show-icon="true"
            :show-length="true"
            :show-line="false"
            theme="dark"
            class="json-tree-view"
          />
          <CodeEditor
            v-else
            ref="outputEditorRef"
            :model-value="workspaceStore.outputPreview"
            :language="isJsonTool ? 'json' : 'text'"
            :readonly="true"
            :show-line-numbers="workspaceStore.showLineNumbers"
          />
        </div>
        <section v-if="isRedisLuaTool && redisLuaLogs.length > 0" class="redis-debug-block">
          <div class="redis-debug-block-header">
            <h3>脚本日志</h3>
          </div>
          <article v-for="(entry, index) in redisLuaLogs" :key="`${entry.level}-${index}`" class="redis-log-card">
            <strong>{{ entry.level }}</strong>
            <pre>{{ entry.message }}</pre>
          </article>
        </section>
        <section v-if="isRedisLuaTool && redisLuaTrace.length > 0" class="redis-debug-block">
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
  </section>
</template>
