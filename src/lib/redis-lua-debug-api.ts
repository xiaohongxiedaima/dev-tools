import { invoke } from "@tauri-apps/api/core";
import type { RedisLuaDebugRequest, RedisLuaDebugResponse } from "./redis-lua-debug";

export async function invokeRedisLuaDebug(request: RedisLuaDebugRequest): Promise<RedisLuaDebugResponse> {
  return invoke<RedisLuaDebugResponse>("run_redis_lua_debug", { request });
}
