<script setup lang="ts">
import { computed, shallowRef } from "vue";
import CodeMirror from "vue-codemirror6";
import { json } from "@codemirror/lang-json";
import { githubDark } from "@uiw/codemirror-theme-github";
import type { Text } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { findEditorMatch } from "../../lib/editor-search";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    readonly?: boolean;
    language?: "json" | "text";
    placeholder?: string;
  }>(),
  {
    readonly: false,
    language: "text",
    placeholder: "",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const lang = computed(() => (props.language === "json" ? json() : undefined));
const extensions = computed(() => [githubDark]);
const editorView = shallowRef<EditorView | null>(null);

function updateValue(value?: string | Text) {
  emit("update:modelValue", typeof value === "string" ? value : value?.toString() ?? "");
}

function handleReady(payload: { view: EditorView }) {
  editorView.value = payload.view;
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
  view.focus();
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
  view.focus();
  return true;
}

defineExpose({
  findNextMatch,
  findPreviousMatch,
});
</script>

<template>
  <div class="code-editor-shell">
    <CodeMirror
      :model-value="props.modelValue"
      basic
      wrap
      :dark="true"
      :readonly="props.readonly"
      :lang="lang"
      :extensions="extensions"
      :placeholder="props.placeholder"
      @ready="handleReady"
      @update:model-value="updateValue"
    />
  </div>
</template>
