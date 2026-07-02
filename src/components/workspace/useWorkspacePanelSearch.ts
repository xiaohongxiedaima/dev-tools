import { nextTick, onBeforeUnmount, onMounted, ref, type Ref } from "vue";

type SearchableEditor = {
  findNextMatch: (query: string) => unknown;
  findPreviousMatch: (query: string) => unknown;
};

type UseWorkspacePanelSearchOptions = {
  inputEditorRef: Ref<SearchableEditor | null>;
  outputEditorRef: Ref<SearchableEditor | null>;
  beforeOutputSearch?: () => Promise<void> | void;
};

export function useWorkspacePanelSearch({
  inputEditorRef,
  outputEditorRef,
  beforeOutputSearch,
}: UseWorkspacePanelSearchOptions) {
  const inputContentRef = ref<HTMLElement | null>(null);
  const outputContentRef = ref<HTMLElement | null>(null);
  const inputSearchInputRef = ref<HTMLInputElement | null>(null);
  const outputSearchInputRef = ref<HTMLInputElement | null>(null);
  const inputSearchQuery = ref("");
  const outputSearchQuery = ref("");
  const inputSearchVisible = ref(false);
  const outputSearchVisible = ref(false);

  async function searchInputNext() {
    inputEditorRef.value?.findNextMatch(inputSearchQuery.value);
    inputSearchInputRef.value?.focus();
  }

  async function searchInputPrevious() {
    inputEditorRef.value?.findPreviousMatch(inputSearchQuery.value);
    inputSearchInputRef.value?.focus();
  }

  async function searchOutputNext() {
    await beforeOutputSearch?.();
    outputEditorRef.value?.findNextMatch(outputSearchQuery.value);
    outputSearchInputRef.value?.focus();
  }

  async function searchOutputPrevious() {
    await beforeOutputSearch?.();
    outputEditorRef.value?.findPreviousMatch(outputSearchQuery.value);
    outputSearchInputRef.value?.focus();
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

  return {
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
  };
}
