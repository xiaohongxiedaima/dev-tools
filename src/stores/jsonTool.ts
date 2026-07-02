import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { JsonTransformMode } from "../lib/json-tools";

export const useJsonToolStore = defineStore("jsonTool", () => {
  const jsonMode = ref<JsonTransformMode>("format");
  const jsonSortKeys = ref(false);
  const jsonOutputMode = ref<"text" | "tree">("text");
  const jsonTreeDepth = ref(Number.POSITIVE_INFINITY);
  const jsonTreeCollapsedNodeLength = ref(Number.POSITIVE_INFINITY);

  const jsonTreeRenderKey = computed(
    () =>
      `jsonTool:${jsonOutputMode.value}:${jsonTreeDepth.value}:${jsonTreeCollapsedNodeLength.value}`,
  );

  function expandJsonTree() {
    jsonTreeDepth.value = Number.POSITIVE_INFINITY;
    jsonTreeCollapsedNodeLength.value = Number.POSITIVE_INFINITY;
  }

  function collapseJsonTree() {
    jsonTreeDepth.value = 1;
    jsonTreeCollapsedNodeLength.value = 2;
  }

  return {
    jsonMode,
    jsonSortKeys,
    jsonOutputMode,
    jsonTreeDepth,
    jsonTreeCollapsedNodeLength,
    jsonTreeRenderKey,
    expandJsonTree,
    collapseJsonTree,
  };
});
