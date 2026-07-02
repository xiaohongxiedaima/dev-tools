import { ref } from "vue";
import { defineStore } from "pinia";
import {
  createDefaultRedisLuaHistoryState,
  createRedisLuaSavedAddressId,
  loadRedisLuaSavedAddresses,
  persistRedisLuaSavedAddresses,
  type RedisLuaDebugResponse,
  type RedisLuaExecutionMode,
  type RedisLuaSavedAddress,
} from "../lib/redis-lua-debug";

export const useRedisLuaStore = defineStore("redisLua", () => {
  const redisLuaDefaults = createDefaultRedisLuaHistoryState();
  const redisLuaRedisUrl = ref(redisLuaDefaults.redisUrl);
  const redisLuaKeysText = ref(redisLuaDefaults.keysText);
  const redisLuaArgvText = ref(redisLuaDefaults.argvText);
  const redisLuaExecutionMode = ref<RedisLuaExecutionMode>(redisLuaDefaults.executionMode);
  const redisLuaSavedAddresses = ref<RedisLuaSavedAddress[]>(loadRedisLuaSavedAddresses());
  const redisLuaIsRunning = ref(false);
  const redisLuaLastResponse = ref<RedisLuaDebugResponse | null>(null);

  function applyRedisLuaDefaults() {
    const defaults = createDefaultRedisLuaHistoryState();
    redisLuaRedisUrl.value = defaults.redisUrl;
    redisLuaKeysText.value = defaults.keysText;
    redisLuaArgvText.value = defaults.argvText;
    redisLuaExecutionMode.value = defaults.executionMode;
    redisLuaIsRunning.value = false;
    redisLuaLastResponse.value = null;
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
    redisLuaSavedAddresses,
    redisLuaIsRunning,
    redisLuaLastResponse,
    applyRedisLuaDefaults,
    setRedisLuaKeysText,
    setRedisLuaArgvText,
    setRedisLuaExecutionMode,
    addRedisLuaSavedAddress,
    updateRedisLuaSavedAddress,
    deleteRedisLuaSavedAddress,
    selectRedisLuaSavedAddress,
  };
});
