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
const inputLanguage = computed(() => workspaceStore.activeTool.inputLanguage ?? "text");
const outputLanguage = computed(() => workspaceStore.activeTool.outputLanguage ?? "text");
const inputPrimaryActionItems = computed((): WorkspaceActionItem[] => [
  ...(workspaceStore.activeTool.id === "base64"
    ? [
        {
          key: "base64-decode",
          label: "解码",
          active: workspaceStore.base64Mode === "decode",
          pressed: workspaceStore.base64Mode === "decode",
          onClick: () => {
            workspaceStore.base64Mode = "decode";
          },
        },
        {
          key: "base64-encode",
          label: "编码",
          active: workspaceStore.base64Mode === "encode",
          pressed: workspaceStore.base64Mode === "encode",
          onClick: () => {
            workspaceStore.base64Mode = "encode";
          },
        },
      ]
    : []),
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
          <div class="workspace-action-bar">
            <div class="workspace-action-bar-left">
              <WorkspaceActionRow :items="inputPrimaryActionItems" />
            </div>
            <div class="workspace-action-bar-right">
              <WorkspaceActionRow :items="inputSecondaryActionItems" />
            </div>
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
          :language="inputLanguage"
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
          <div class="workspace-action-bar">
            <div class="workspace-action-bar-left" />
            <div class="workspace-action-bar-right">
              <WorkspaceActionRow :items="outputActionItems" />
            </div>
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
          :language="outputLanguage"
          :readonly="true"
          :show-line-numbers="workspaceStore.outputShowLineNumbers"
          :wrap="workspaceStore.outputSoftWrap"
        />
      </div>
    </article>
  </section>
</template>
