export type RedisLuaExecutionMode = "proxy" | "eval";

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
};

export const DEFAULT_REDIS_LUA_REDIS_URL = "redis://127.0.0.1:6379/0";
export const DEFAULT_REDIS_LUA_KEYS_TEXT = "";
export const DEFAULT_REDIS_LUA_ARGV_TEXT = "";
export const DEFAULT_REDIS_LUA_EXECUTION_MODE: RedisLuaExecutionMode = "proxy";
export const REDIS_LUA_SAVED_ADDRESSES_STORAGE_KEY = "redis-lua-saved-addresses";
export const DEFAULT_REDIS_LUA_SAVED_ADDRESSES: RedisLuaSavedAddress[] = [
  { id: "default-local", label: "本地 Redis", url: DEFAULT_REDIS_LUA_REDIS_URL },
];

export function createDefaultRedisLuaHistoryState(): RedisLuaHistoryState {
  return {
    redisUrl: DEFAULT_REDIS_LUA_REDIS_URL,
    keysText: DEFAULT_REDIS_LUA_KEYS_TEXT,
    argvText: DEFAULT_REDIS_LUA_ARGV_TEXT,
    executionMode: DEFAULT_REDIS_LUA_EXECUTION_MODE,
  };
}

/**
 * 解析 KEYS/ARGV 输入文本为字符串数组。
 * 普通参数以空格分隔；用双引号或单引号包裹的段（含空格）作为一个整体。
 * 若整段输入是合法 JSON 对象/数组，则作为单个元素返回。
 */
export function parseRedisLuaArrayInput(input: string, _fieldLabel: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  // 尝试将整个输入解析为 JSON（对象或数组）
  const jsonResult = tryParseJson(trimmed);
  if (jsonResult !== null) {
    return [jsonResult];
  }

  return splitArgTokens(trimmed);
}

/**
 * 尝试将输入解析为 JSON 对象或数组，成功则返回其字符串形式，失败返回 null。
 */
function tryParseJson(input: string): string | null {
  if ((input.startsWith("{") && input.endsWith("}")) || (input.startsWith("[") && input.endsWith("]"))) {
    try {
      JSON.parse(input);
      return input; // 是合法 JSON，原样返回
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 把输入按空格分割为 token，支持引号包裹含空格的段。
 * - 只有在 token 起始位置的引号才视为包裹引号
 * - 被引号包裹的内容作为一个整体，内部空格不拆分
 * - 以 { 或 [ 开头的 token 会贪婪匹配到对应的闭合括号（处理内部空格和嵌套引号）
 * - 其余未包裹部分按空格分割
 */
function splitArgTokens(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < input.length) {
    // 跳过空白
    while (i < input.length && /\s/.test(input[i])) {
      i++;
    }
    if (i >= input.length) {
      break;
    }

    const ch = input[i];

    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++; // 跳过起始引号
      let current = "";
      while (i < input.length && input[i] !== quote) {
        current += input[i];
        i++;
      }
      i++; // 跳过结束引号
      tokens.push(current);
    } else if (ch === "{" || ch === "[") {
      const open = ch;
      const close = ch === "{" ? "}" : "]";
      let depth = 0;
      let inStr: string | null = null;
      let current = "";
      while (i < input.length) {
        const c = input[i];
        if (inStr) {
          current += c;
          if (c === inStr && input[i - 1] !== "\\") {
            inStr = null;
          }
          i++;
          continue;
        }
        if (c === '"' || c === "'") {
          inStr = c;
          current += c;
          i++;
          continue;
        }
        if (c === open) {
          depth++;
        } else if (c === close) {
          depth--;
          if (depth === 0) {
            current += c;
            i++;
            break;
          }
        }
        current += c;
        i++;
      }
      tokens.push(current);
    } else {
      let current = "";
      while (i < input.length && !/\s/.test(input[i])) {
        current += input[i];
        i++;
      }
      tokens.push(current);
    }
  }

  return tokens;
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
