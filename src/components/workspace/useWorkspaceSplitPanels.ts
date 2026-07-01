import { computed, onBeforeUnmount, ref } from "vue";

export function useWorkspaceSplitPanels() {
  const workspacePanelsRef = ref<HTMLElement | null>(null);
  const inputPanelWidth = ref(50);
  let cleanupPanelResizeListeners: (() => void) | null = null;

  const inputPanelStyle = computed(() => ({
    flexBasis: `calc(${inputPanelWidth.value}% - 5px)`,
  }));
  const outputPanelStyle = computed(() => ({
    flexBasis: `calc(${100 - inputPanelWidth.value}% - 5px)`,
  }));

  function setInputPanelWidth(nextWidth: number) {
    inputPanelWidth.value = Math.min(Math.max(nextWidth, 25), 75);
  }

  function stopPanelResize() {
    cleanupPanelResizeListeners?.();
    cleanupPanelResizeListeners = null;
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  }

  function nudgePanelResize(delta: number) {
    setInputPanelWidth(inputPanelWidth.value + delta);
  }

  function startPanelResize(event: PointerEvent) {
    const workspacePanels = workspacePanelsRef.value;
    if (!workspacePanels) {
      return;
    }

    event.preventDefault();
    const handleWidth = 10;
    const bounds = workspacePanels.getBoundingClientRect();
    const availableWidth = bounds.width - handleWidth;
    if (availableWidth <= 0) {
      return;
    }

    const startX = event.clientX;
    const startWidth = (inputPanelWidth.value / 100) * availableWidth;
    const minPanelWidth = Math.min(320, Math.max(180, availableWidth * 0.25));
    const maxPanelWidth = availableWidth - minPanelWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.min(Math.max(startWidth + delta, minPanelWidth), maxPanelWidth);
      setInputPanelWidth((nextWidth / availableWidth) * 100);
    };

    const handlePointerUp = () => {
      stopPanelResize();
    };

    cleanupPanelResizeListeners = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }

  onBeforeUnmount(() => {
    stopPanelResize();
  });

  return {
    workspacePanelsRef,
    inputPanelStyle,
    outputPanelStyle,
    nudgePanelResize,
    startPanelResize,
  };
}
