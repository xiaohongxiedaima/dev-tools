<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { List, WrapText, ZoomIn, ZoomOut } from "lucide-vue-next";
import { applyJsonTransform } from "../../lib/json-tools";
import { useWorkspaceStore } from "../../stores/workspace";
import { useJsonToolStore } from "../../stores/jsonTool";
import { useThemeStore } from "../../stores/theme";
import CodeEditor from "./CodeEditor.vue";
import WorkspaceActionRow from "./WorkspaceActionRow.vue";
import type { WorkspaceActionItem } from "./WorkspaceActionRow.vue";
import { useWorkspacePanelSearch } from "./useWorkspacePanelSearch";
import { useWorkspaceSplitPanels } from "./useWorkspaceSplitPanels";

const workspaceStore = useWorkspaceStore();
const jsonStore = useJsonToolStore();
const themeStore = useThemeStore();
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
const jsonTextPreview = computed(() => {
  if (!workspaceStore.liveMode) {
    return workspaceStore.outputPreview;
  }

  if (!workspaceStore.inputValue) {
    return workspaceStore.activeTool.sampleOutput;
  }

  try {
    return applyJsonTransform(workspaceStore.inputValue, {
      mode: jsonStore.jsonMode,
      sortKeys: jsonStore.jsonSortKeys,
    });
  } catch (error) {
    return `JSON 解析失败：${error instanceof Error ? error.message : String(error)}`;
  }
});
const showJsonTree = computed(
  () => jsonStore.jsonOutputMode === "tree" && workspaceStore.jsonTreeData !== null,
);
const showJsonTextOutputControls = computed(() => !showJsonTree.value);
const jsonTreeExpanded = computed(() => jsonStore.jsonTreeDepth !== 1);
const jsonInputPrimaryItems = computed((): WorkspaceActionItem[] => [
  {
    key: "format",
    label: "格式化",
    active: jsonStore.jsonMode === "format",
    onClick: () => void applyJsonMode("format"),
  },
  {
    key: "minify",
    label: "压缩",
    active: jsonStore.jsonMode === "minify",
    onClick: () => void applyJsonMode("minify"),
  },
  {
    key: "sort",
    label: "排序",
    active: jsonStore.jsonSortKeys,
    pressed: jsonStore.jsonSortKeys,
    onClick: () => void applyJsonSortToggle(),
  },
  {
    key: "live",
    label: "实时预览",
    active: workspaceStore.liveMode,
    pressed: workspaceStore.liveMode,
    onClick: () => {
      workspaceStore.liveMode = !workspaceStore.liveMode;
    },
  },
  {
    key: "run",
    label: "转换",
    variant: "primary",
    visible: !workspaceStore.liveMode,
    onClick: () => void runActiveTool(),
  },
]);
const jsonInputSecondaryItems = computed((): WorkspaceActionItem[] => [
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
const jsonOutputPrimaryItems = computed((): WorkspaceActionItem[] => [
  {
    key: "text-mode",
    label: "文本视图",
    active: jsonStore.jsonOutputMode === "text",
    onClick: () => {
      jsonStore.jsonOutputMode = "text";
    },
  },
  {
    key: "tree-mode",
    label: "树状视图",
    active: jsonStore.jsonOutputMode === "tree",
    onClick: () => {
      jsonStore.jsonOutputMode = "tree";
    },
  },
]);
const jsonOutputSecondaryItems = computed((): WorkspaceActionItem[] => [
  {
    key: "output-lines",
    label: "行号",
    icon: List,
    active: workspaceStore.outputShowLineNumbers,
    pressed: workspaceStore.outputShowLineNumbers,
    visible: showJsonTextOutputControls.value,
    onClick: () => {
      workspaceStore.outputShowLineNumbers = !workspaceStore.outputShowLineNumbers;
    },
  },
  {
    key: "output-wrap",
    label: "换行",
    icon: WrapText,
    active: workspaceStore.outputSoftWrap,
    pressed: workspaceStore.outputSoftWrap,
    visible: showJsonTextOutputControls.value,
    onClick: () => {
      workspaceStore.outputSoftWrap = !workspaceStore.outputSoftWrap;
    },
  },
  {
    key: "font-zoom-in",
    label: "放大字体",
    icon: ZoomIn,
    visible: showJsonTextOutputControls.value,
    onClick: () => workspaceStore.zoomEditorFont("output", 1),
  },
  {
    key: "font-zoom-out",
    label: "缩小字体",
    icon: ZoomOut,
    visible: showJsonTextOutputControls.value,
    onClick: () => workspaceStore.zoomEditorFont("output", -1),
  },
  {
    key: "copy",
    label: copyButtonLabel.value,
    visible: showJsonTextOutputControls.value,
    onClick: () => void copyOutput(),
  },
  {
    key: "tree-toggle",
    label: jsonTreeExpanded.value ? "折叠" : "展开",
    visible: showJsonTree.value,
    onClick: () => {
      if (jsonTreeExpanded.value) {
        jsonStore.collapseJsonTree();
        return;
      }
      jsonStore.expandJsonTree();
    },
  },
  {
    key: "tree-copy",
    label: copyButtonLabel.value,
    visible: showJsonTree.value,
    onClick: () => void copyOutput(),
  },
]);
const { workspacePanelsRef, inputPanelStyle, outputPanelStyle, nudgePanelResize, startPanelResize } =
  useWorkspaceSplitPanels();

async function prepareJsonTextOutput() {
  if (jsonStore.jsonOutputMode === "tree") {
    jsonStore.jsonOutputMode = "text";
    await nextTick();
  }
}

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
  beforeOutputSearch: prepareJsonTextOutput,
});

async function applyJsonMode(mode: "format" | "minify") {
  await prepareJsonTextOutput();
  jsonStore.jsonMode = mode;
}

async function applyJsonSortToggle() {
  await prepareJsonTextOutput();
  jsonStore.jsonSortKeys = !jsonStore.jsonSortKeys;
}

async function copyOutput() {
  try {
    await navigator.clipboard.writeText(jsonTextPreview.value);
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
          <div class="workspace-action-bar">
            <div class="workspace-action-bar-left">
              <WorkspaceActionRow :items="jsonInputPrimaryItems" />
            </div>
            <div class="workspace-action-bar-right">
              <WorkspaceActionRow :items="jsonInputSecondaryItems" grouped />
            </div>
          </div>
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
          :language="'json'"
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
          <div class="workspace-action-bar">
            <div class="workspace-action-bar-left">
              <WorkspaceActionRow :items="jsonOutputPrimaryItems" />
            </div>
            <div class="workspace-action-bar-right">
              <WorkspaceActionRow :items="jsonOutputSecondaryItems" grouped />
            </div>
          </div>
        </div>
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
        <VueJsonPretty
          v-if="showJsonTree"
          :key="jsonStore.jsonTreeRenderKey"
          :data="workspaceStore.jsonTreeData"
          :deep="jsonStore.jsonTreeDepth"
          :collapsed-node-length="jsonStore.jsonTreeCollapsedNodeLength"
          :collapsed-on-click-brackets="true"
          :show-icon="true"
          :show-length="true"
          :show-line="false"
          :theme="themeStore.isDark ? 'dark' : 'light'"
          class="json-tree-view"
        />
        <CodeEditor
          v-else
          :key="`${workspaceStore.activeToolId}:${jsonStore.jsonOutputMode}:${jsonStore.jsonMode}:${jsonStore.jsonSortKeys}:${jsonTextPreview}`"
          ref="outputEditorRef"
          :model-value="jsonTextPreview"
          :language="'json'"
          :readonly="true"
          :show-line-numbers="workspaceStore.outputShowLineNumbers"
          :wrap="workspaceStore.outputSoftWrap"
          :font-size="workspaceStore.outputFontSize"
        />
      </div>
    </article>
  </section>
</template>
