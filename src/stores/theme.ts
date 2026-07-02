import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "dev-tools:theme";

function resolveInitialMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // localStorage 不可用时回退到系统偏好
  }

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export const useThemeStore = defineStore("theme", () => {
  const mode = ref<ThemeMode>(resolveInitialMode());
  const isDark = computed(() => mode.value === "dark");

  function setMode(next: ThemeMode) {
    mode.value = next;
  }

  function toggle() {
    mode.value = mode.value === "dark" ? "light" : "dark";
  }

  watch(
    mode,
    (next) => {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // 持久化失败不影响当前会话
      }
      // Arco Design 用 body[arco-theme="dark"] 切换
      document.body.setAttribute("arco-theme", next);
      // 自定义 CSS 变量用 data-theme 切换
      document.documentElement.setAttribute("data-theme", next);
    },
    { immediate: true },
  );

  return {
    mode,
    isDark,
    setMode,
    toggle,
  };
});
