import { ref } from "vue";
import { defineStore } from "pinia";
import {
  createDefaultRedisLuaHistoryState,
  createRedisLuaSavedAddressId,
  formatRedisLuaArrayAsJson,
  loadRedisLuaSavedAddresses,
  persistRedisLuaSavedAddresses,
  tryParseRedisLuaArray,
  type RedisLuaDebugResponse,
  type RedisLuaExecutionMode,
  type RedisLuaInputMode,
  type RedisLuaSavedAddress,
} from "../lib/redis-lua-debug";

export const useRedisLuaStore = defineStore("redisLua", () => {
  const redisLuaDefaults = createDefaultRedisLuaHistoryState();
  const redisLuaRedisUrl = ref(redisLuaDefaults.redisUrl);
  const redisLuaKeysText = ref(redisLuaDefaults.keysText);
  const redisLuaArgvText = ref(redisLuaDefaults.argvText);
  const redisLuaExecutionMode = ref<RedisLuaExecutionMode>(redisLuaDefaults.executionMode);
  const redisLuaKeysInputMode = ref<RedisLuaInputMode>(redisLuaDefaults.keysInputMode ?? "json");
  const redisLuaArgvInputMode = ref<RedisLuaInputMode>(redisLuaDefaults.argvInputMode ?? "json");
  const redisLuaSavedAddresses = ref<RedisLuaSavedAddress[]>(loadRedisLuaSavedAddresses());
  const redisLuaKeysItems = ref<string[]>([]);
  const redisLuaArgvItems = ref<string[]>([]);
  const redisLuaIsRunning = ref(false);
  const redisLuaLastResponse = ref<RedisLuaDebugResponse | null>(null);

  function applyRedisLuaDefaults() {
    const defaults = createDefaultRedisLuaHistoryState();
    redisLuaRedisUrl.value = defaults.redisUrl;
    redisLuaKeysText.value = defaults.keysText;
    redisLuaArgvText.value = defaults.argvText;
    redisLuaExecutionMode.value = defaults.executionMode;
    redisLuaKeysInputMode.value = defaults.keysInputMode ?? "json";
    redisLuaArgvInputMode.value = defaults.argvInputMode ?? "json";
    redisLuaIsRunning.value = false;
    redisLuaLastResponse.value = null;
  }

  function setRedisLuaRedisUrl(value: string) {
    redisLuaRedisUrl.value = value;
  }

  function setRedisLuaKeysText(value: string) {
    redisLuaKeysText.value = value;
  }

  function setRedisLuaArgvText(value: string) {
    redisLuaArgvText.value = value;
  }

  function setRedisLuaExecutionMode(mode: RedisLuaExecutionMode) {
    redisLuaExecutionMode.value = mode;
  }

  /**
   * 切换 KEYS/ARGV 的输入模式，并在切换时做双向同步：
   * - json -> items：把当前 JSON 文本解析为逐项列表；解析失败则用空列表。
   * - items -> json：把逐项列表序列化为 JSON 数组文本，写回 keysText/argvText。
   */
  function setRedisLuaKeysInputMode(mode: RedisLuaInputMode) {
    if (redisLuaKeysInputMode.value === mode) {
      return;
    }
    if (mode === "items") {
      redisLuaKeysItems.value = [...(tryParseRedisLuaArray(redisLuaKeysText.value) ?? [])];
    } else {
      redisLuaKeysText.value = formatRedisLuaArrayAsJson(redisLuaKeysItems.value);
    }
    redisLuaKeysInputMode.value = mode;
  }

  function setRedisLuaArgvInputMode(mode: RedisLuaInputMode) {
    if (redisLuaArgvInputMode.value === mode) {
      return;
    }
    if (mode === "items") {
      redisLuaArgvItems.value = [...(tryParseRedisLuaArray(redisLuaArgvText.value) ?? [])];
    } else {
      redisLuaArgvText.value = formatRedisLuaArrayAsJson(redisLuaArgvItems.value);
    }
    redisLuaArgvInputMode.value = mode;
  }

  function updateRedisLuaKeysItem(index: number, value: string) {
    if (index < 0 || index >= redisLuaKeysItems.value.length) {
      return;
    }
    redisLuaKeysItems.value = redisLuaKeysItems.value.map((item, i) => (i === index ? value : item));
    redisLuaKeysText.value = formatRedisLuaArrayAsJson(redisLuaKeysItems.value);
  }

  function addRedisLuaKeysItem() {
    redisLuaKeysItems.value = [...redisLuaKeysItems.value, ""];
    redisLuaKeysText.value = formatRedisLuaArrayAsJson(redisLuaKeysItems.value);
  }

  function removeRedisLuaKeysItem(index: number) {
    redisLuaKeysItems.value = redisLuaKeysItems.value.filter((_, i) => i !== index);
    redisLuaKeysText.value = formatRedisLuaArrayAsJson(redisLuaKeysItems.value);
  }

  function updateRedisLuaArgvItem(index: number, value: string) {
    if (index < 0 || index >= redisLuaArgvItems.value.length) {
      return;
    }
    redisLuaArgvItems.value = redisLuaArgvItems.value.map((item, i) => (i === index ? value : item));
    redisLuaArgvText.value = formatRedisLuaArrayAsJson(redisLuaArgvItems.value);
  }

  function addRedisLuaArgvItem() {
    redisLuaArgvItems.value = [...redisLuaArgvItems.value, ""];
    redisLuaArgvText.value = formatRedisLuaArrayAsJson(redisLuaArgvItems.value);
  }

  function removeRedisLuaArgvItem(index: number) {
    redisLuaArgvItems.value = redisLuaArgvItems.value.filter((_, i) => i !== index);
    redisLuaArgvText.value = formatRedisLuaArrayAsJson(redisLuaArgvItems.value);
  }

  function addRedisLuaSavedAddress(label: string, url: string) {
    const trimmedLabel = label.trim() || "未命名地址";
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return;
    }
    redisLuaSavedAddresses.value = [
      ...redisLuaSavedAddresses.value,
      { id: createRedisLuaSavedAddressId(), label: trimmedLabel, url: trimmedUrl },
    ];
    persistRedisLuaSavedAddresses(redisLuaSavedAddresses.value);
    redisLuaRedisUrl.value = trimmedUrl;
  }

  function updateRedisLuaSavedAddress(id: string, label: string, url: string) {
    const trimmedLabel = label.trim() || "未命名地址";
    const trimmedUrl = url.trim();
    redisLuaSavedAddresses.value = redisLuaSavedAddresses.value.map((entry) =>
      entry.id === id ? { ...entry, label: trimmedLabel, url: trimmedUrl || entry.url } : entry,
    );
    persistRedisLuaSavedAddresses(redisLuaSavedAddresses.value);
  }

  function deleteRedisLuaSavedAddress(id: string) {
    redisLuaSavedAddresses.value = redisLuaSavedAddresses.value.filter((entry) => entry.id !== id);
    persistRedisLuaSavedAddresses(redisLuaSavedAddresses.value);
  }

  function selectRedisLuaSavedAddress(id: string) {
    const target = redisLuaSavedAddresses.value.find((entry) => entry.id === id);
    if (target) {
      redisLuaRedisUrl.value = target.url;
    }
  }

  return {
    redisLuaRedisUrl,
    redisLuaKeysText,
    redisLuaArgvText,
    redisLuaExecutionMode,
    redisLuaKeysInputMode,
    redisLuaArgvInputMode,
    redisLuaSavedAddresses,
    redisLuaKeysItems,
    redisLuaArgvItems,
    redisLuaIsRunning,
    redisLuaLastResponse,
    applyRedisLuaDefaults,
    setRedisLuaRedisUrl,
    setRedisLuaKeysText,
    setRedisLuaArgvText,
    setRedisLuaExecutionMode,
    setRedisLuaKeysInputMode,
    setRedisLuaArgvInputMode,
    updateRedisLuaKeysItem,
    addRedisLuaKeysItem,
    removeRedisLuaKeysItem,
    updateRedisLuaArgvItem,
    addRedisLuaArgvItem,
    removeRedisLuaArgvItem,
    addRedisLuaSavedAddress,
    updateRedisLuaSavedAddress,
    deleteRedisLuaSavedAddress,
    selectRedisLuaSavedAddress,
  };
});
