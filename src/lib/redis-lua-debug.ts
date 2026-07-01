export type RedisLuaExecutionMode = "proxy" | "eval";

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
};

export const DEFAULT_REDIS_LUA_REDIS_URL = "redis://127.0.0.1:6379/0";
export const DEFAULT_REDIS_LUA_KEYS_TEXT = "[\n  \"demo:key\"\n]";
export const DEFAULT_REDIS_LUA_ARGV_TEXT = "[\n  \"demo-value\"\n]";
export const DEFAULT_REDIS_LUA_EXECUTION_MODE: RedisLuaExecutionMode = "proxy";
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

export function formatRedisLuaDebugResponse(response: RedisLuaDebugResponse): string {
  const payload = {
    success: response.success,
    mode: response.mode,
    error: response.error,
    result: response.resultPreview,
    traceCount: response.trace.length,
    logCount: response.logs.length,
  };

  return JSON.stringify(payload, null, 2);
}

export function createDefaultRedisLuaHistoryState(): RedisLuaHistoryState {
  return {
    redisUrl: DEFAULT_REDIS_LUA_REDIS_URL,
    keysText: DEFAULT_REDIS_LUA_KEYS_TEXT,
    argvText: DEFAULT_REDIS_LUA_ARGV_TEXT,
    executionMode: DEFAULT_REDIS_LUA_EXECUTION_MODE,
  };
}
