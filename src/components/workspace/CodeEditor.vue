<script setup lang="ts">
import { computed, shallowRef } from "vue";
import CodeMirror from "vue-codemirror6";
import { json } from "@codemirror/lang-json";
import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
import type { Text } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { findEditorMatch } from "../../lib/editor-search";
import { useThemeStore } from "../../stores/theme";

const themeStore = useThemeStore();

const props = withDefaults(
  defineProps<{
    modelValue: string;
    readonly?: boolean;
    language?: "json" | "lua" | "text";
    placeholder?: string;
    showLineNumbers?: boolean;
    wrap?: boolean;
    fontSize?: number;
  }>(),
  {
    readonly: false,
    language: "text",
    placeholder: "",
    showLineNumbers: true,
    wrap: false,
    fontSize: 14,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  blur: [];
}>();

const lang = computed(() => {
  if (props.language === "json") {
    return json();
  }

  if (props.language === "lua") {
    return new LanguageSupport(StreamLanguage.define(lua));
  }

  return undefined;
});
const extensions = computed(() => [themeStore.isDark ? githubDark : githubLight]);
const editorView = shallowRef<EditorView | null>(null);

function updateValue(value?: string | Text) {
  emit("update:modelValue", typeof value === "string" ? value : value?.toString() ?? "");
}

function handleReady(payload: { view: EditorView }) {
  editorView.value = payload.view;
}

function handleFocusOut(event: FocusEvent) {
  const currentTarget = event.currentTarget;
  const relatedTarget = event.relatedTarget;

  if (
    currentTarget instanceof HTMLElement &&
    relatedTarget instanceof Node &&
    currentTarget.contains(relatedTarget)
  ) {
    return;
  }

  emit("blur");
}

function findNextMatch(query: string) {
  const view = editorView.value;
  if (!view) {
    return false;
  }

  const match = findEditorMatch(props.modelValue, query, {
    from: view.state.selection.main.from,
    to: view.state.selection.main.to,
  });

  if (!match) {
    return false;
  }

  view.dispatch({
    selection: { anchor: match.from, head: match.to },
    scrollIntoView: true,
  });
  return true;
}

function findPreviousMatch(query: string) {
  const view = editorView.value;
  if (!view) {
    return false;
  }

  const match = findEditorMatch(
    props.modelValue,
    query,
    {
      from: view.state.selection.main.from,
      to: view.state.selection.main.to,
    },
    "previous",
  );

  if (!match) {
    return false;
  }

  view.dispatch({
    selection: { anchor: match.from, head: match.to },
    scrollIntoView: true,
  });
  return true;
}

defineExpose({
  findNextMatch,
  findPreviousMatch,
});
</script>

<template>
  <div
    class="code-editor-shell"
    :class="{ 'code-editor-shell--hide-line-numbers': !props.showLineNumbers }"
    :style="{ '--editor-font-size': `${props.fontSize}px` }"
    @focusout="handleFocusOut"
  >
    <CodeMirror
      :model-value="props.modelValue"
      basic
      :wrap="props.wrap"
      :dark="themeStore.isDark"
      :readonly="props.readonly"
      :lang="lang"
      :extensions="extensions"
      :placeholder="props.placeholder"
      @ready="handleReady"
      @update:model-value="updateValue"
    />
  </div>
</template>

<style scoped>
.code-editor-shell {
  display: flex;
  flex-direction: column;
}

.code-editor-shell :deep(.vue-codemirror) {
  display: flex;
  flex: 1 1 0;
  min-height: 0;
}

.code-editor-shell :deep(.cm-editor) {
  flex: 1;
  min-height: 0;
  font-size: var(--editor-font-size, 14px);
}

.code-editor-shell--hide-line-numbers :deep(.cm-gutters) {
  display: none;
}
</style>
