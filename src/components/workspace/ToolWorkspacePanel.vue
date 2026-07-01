<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { useWorkspaceStore } from "../../stores/workspace";
import CodeEditor from "./CodeEditor.vue";
import ToolActionBar from "./ToolActionBar.vue";

const workspaceStore = useWorkspaceStore();
const isJsonTool = computed(() => workspaceStore.activeTool.id === "json-formatter");
const showJsonTree = computed(
  () => isJsonTool.value && workspaceStore.jsonOutputMode === "tree" && workspaceStore.jsonTreeData !== null,
);
const inputEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null);
const outputEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null);
const inputSearchQuery = ref("");
const outputSearchQuery = ref("");
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
</script>

<template>
  <section class="workspace-main">
    <header class="workspace-header shell-card">
      <div>
        <p class="eyebrow">{{ workspaceStore.activeTool.categoryName }}</p>
        <h1>{{ workspaceStore.activeTool.name }}</h1>
        <p class="summary narrow">{{ workspaceStore.activeTool.description }}</p>
      </div>

      <ToolActionBar />
    </header>

    <section class="workspace-panels">
      <article class="editor-panel shell-card">
        <div class="panel-header">
          <div>
            <h2>输入区</h2>
            <p>保留原始内容，适合粘贴请求体、时间值、URL 或待转换文本。</p>
            <div v-if="isJsonTool" class="json-action-row">
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
            <div class="editor-search-row">
              <input
                id="input-search-query"
                v-model="inputSearchQuery"
                type="text"
                placeholder="搜索输入内容"
                @keydown.enter.prevent="searchInputNext"
              />
              <button class="ghost-button small" type="button" @click="searchInputNext">查找</button>
              <button class="ghost-button small" type="button" @click="searchInputPrevious">上一个</button>
              <button class="ghost-button small" type="button" @click="searchInputNext">下一个</button>
            </div>
          </div>
          <label class="toggle-line">
            <input
              :checked="workspaceStore.liveMode"
              type="checkbox"
              @change="workspaceStore.setLiveMode(($event.target as HTMLInputElement).checked)"
            />
            <span>实时预览</span>
          </label>
        </div>

        <CodeEditor
          ref="inputEditorRef"
          :model-value="workspaceStore.inputValue"
          :language="isJsonTool ? 'json' : 'text'"
          :placeholder="workspaceStore.activeTool.placeholder"
          @update:model-value="workspaceStore.setInputValue"
        />
      </article>

      <article class="editor-panel shell-card">
        <div class="panel-header">
          <div>
            <h2>输出区</h2>
            <p>展示格式化结果、转换结果或工具处理后的预览内容。</p>
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
            <div class="editor-search-row">
              <input
                id="output-search-query"
                v-model="outputSearchQuery"
                type="text"
                placeholder="搜索输出内容"
                @keydown.enter.prevent="searchOutputNext"
              />
              <button class="ghost-button small" type="button" @click="searchOutputNext">查找</button>
              <button class="ghost-button small" type="button" @click="searchOutputPrevious">上一个</button>
              <button class="ghost-button small" type="button" @click="searchOutputNext">下一个</button>
            </div>
          </div>
        </div>

        <div class="output-preview">
          <strong v-if="!isJsonTool">{{ workspaceStore.activeTool.sampleOutputTitle }}</strong>
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
          />
        </div>
      </article>
    </section>
  </section>
</template>
