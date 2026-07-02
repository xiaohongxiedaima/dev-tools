export type RedisLuaExecutionMode = "proxy" | "eval";

export type RedisLuaInputMode = "json" | "items";

export type RedisLuaSavedAddress = {
  id: string;
  label: string;
  url: string;
};

export type RedisLuaDebugRequest = {
  redisUrl: string;
  script: string;
  keys: string[];
  argv: string[];
  executionMode: RedisLuaExecutionMode;
};

export type RedisLuaTraceEntry = {
  index: number;
  command: string;
  args: string[];
  durationMs: number;
  ok: boolean;
  replyPreview: string | null;
  error: string | null;
  sourceLine: number | null;
};

export type RedisLuaLogEntry = {
  level: string;
  message: string;
};

export type RedisLuaDebugResponse = {
  success: boolean;
  mode: RedisLuaExecutionMode;
  resultPreview: string;
  error: string | null;
  trace: RedisLuaTraceEntry[];
  logs: RedisLuaLogEntry[];
};

export type RedisLuaHistoryState = {
  redisUrl: string;
  keysText: string;
  argvText: string;
  executionMode: RedisLuaExecutionMode;
  keysInputMode?: RedisLuaInputMode;
  argvInputMode?: RedisLuaInputMode;
};

export const DEFAULT_REDIS_LUA_REDIS_URL = "redis://127.0.0.1:6379/0";
export const DEFAULT_REDIS_LUA_KEYS_TEXT = "[]";
export const DEFAULT_REDIS_LUA_ARGV_TEXT = "[]";
export const DEFAULT_REDIS_LUA_EXECUTION_MODE: RedisLuaExecutionMode = "proxy";
export const DEFAULT_REDIS_LUA_KEYS_INPUT_MODE: RedisLuaInputMode = "items";
export const DEFAULT_REDIS_LUA_ARGV_INPUT_MODE: RedisLuaInputMode = "items";
export const REDIS_LUA_SAVED_ADDRESSES_STORAGE_KEY = "redis-lua-saved-addresses";
export const DEFAULT_REDIS_LUA_SAVED_ADDRESSES: RedisLuaSavedAddress[] = [
  { id: "default-local", label: "本地 Redis", url: DEFAULT_REDIS_LUA_REDIS_URL },
];
export const DEFAULT_REDIS_LUA_SCRIPT = `local current = redis.call("GET", KEYS[1])

if not current then
  redis.call("SET", KEYS[1], ARGV[1])
end

return {
  before = current,
  after = redis.call("GET", KEYS[1])
}`;

function normalizeRedisArrayValue(value: unknown, fieldLabel: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldLabel} 必须是 JSON 数组。`);
  }

  return value.map((entry, index) => {
    if (typeof entry === "string") {
      return entry;
    }

    if (typeof entry === "number" || typeof entry === "boolean") {
      return String(entry);
    }

    if (entry === null) {
      return "";
    }

    throw new Error(`${fieldLabel} 第 ${index + 1} 项只能是字符串、数字、布尔值或 null。`);
  });
}

export function createDefaultRedisLuaHistoryState(): RedisLuaHistoryState {
  return {
    redisUrl: DEFAULT_REDIS_LUA_REDIS_URL,
    keysText: DEFAULT_REDIS_LUA_KEYS_TEXT,
    argvText: DEFAULT_REDIS_LUA_ARGV_TEXT,
    executionMode: DEFAULT_REDIS_LUA_EXECUTION_MODE,
    keysInputMode: DEFAULT_REDIS_LUA_KEYS_INPUT_MODE,
    argvInputMode: DEFAULT_REDIS_LUA_ARGV_INPUT_MODE,
  };
}

export function parseRedisLuaArrayInput(input: string, fieldLabel: string): string[] {
  const trimmed = input.trim();

  if (!trimmed) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`${fieldLabel} 不是合法的 JSON：${error instanceof Error ? error.message : String(error)}`);
  }

  return normalizeRedisArrayValue(parsed, fieldLabel);
}

export function tryParseRedisLuaArray(input: string): string[] | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return normalizeRedisArrayValue(parsed, "数组");
  } catch {
    return null;
  }
}

/**
 * 把字符串数组格式化为 JSON 数组文本（保持可读缩进）。
 */
export function formatRedisLuaArrayAsJson(items: string[]): string {
  if (items.length === 0) {
    return "[]";
  }
  return `[\n${items.map((item) => `  ${JSON.stringify(item)}`).join(",\n")}\n]`;
}

/**
 * 加载持久化的 Redis 地址列表，失败或为空时返回默认列表。
 */
export function loadRedisLuaSavedAddresses(): RedisLuaSavedAddress[] {
  try {
    const raw = localStorage.getItem(REDIS_LUA_SAVED_ADDRESSES_STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_REDIS_LUA_SAVED_ADDRESSES];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_REDIS_LUA_SAVED_ADDRESSES];
    }
    return parsed
      .filter(
        (entry): entry is RedisLuaSavedAddress =>
          entry &&
          typeof entry === "object" &&
          typeof entry.id === "string" &&
          typeof entry.label === "string" &&
          typeof entry.url === "string",
      )
      .map((entry) => ({ id: entry.id, label: entry.label, url: entry.url }));
  } catch {
    return [...DEFAULT_REDIS_LUA_SAVED_ADDRESSES];
  }
}

/**
 * 持久化 Redis 地址列表。
 */
export function persistRedisLuaSavedAddresses(addresses: RedisLuaSavedAddress[]): void {
  try {
    localStorage.setItem(REDIS_LUA_SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(addresses));
  } catch {
    // 忽略写入失败（隐私模式 / 配额满）
  }
}

export function createRedisLuaSavedAddressId(): string {
  return `addr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
