import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_REDIS_LUA_EXECUTION_MODE,
  DEFAULT_REDIS_LUA_REDIS_URL,
  createDefaultRedisLuaHistoryState,
  formatRedisLuaDebugResponse,
  parseRedisLuaArrayInput,
} from "../src/lib/redis-lua-debug.ts";

const toolsSource = readFileSync(new URL("../src/lib/tools.ts", import.meta.url), "utf8");
const workspacePanel = readFileSync(new URL("../src/components/workspace/ToolWorkspacePanel.vue", import.meta.url), "utf8");
const workspaceStore = readFileSync(new URL("../src/stores/workspace.ts", import.meta.url), "utf8");
const appVue = readFileSync(new URL("../src/App.vue", import.meta.url), "utf8");
const homeView = readFileSync(new URL("../src/views/HomeView.vue", import.meta.url), "utf8");
const actionBar = readFileSync(new URL("../src/components/workspace/ToolActionBar.vue", import.meta.url), "utf8");

test("redis lua tool is registered in database tools", () => {
  assert.match(toolsSource, /id: "database"/);
  assert.match(toolsSource, /id: "redis-lua-debug-console"/);
  assert.match(toolsSource, /name: "Redis Lua 调试台"/);
  assert.match(toolsSource, /代理 redis\.call \/ redis\.pcall 到 Redis/);
});

test("redis lua helper parses JSON arrays into string arguments", () => {
  assert.deepEqual(parseRedisLuaArrayInput('["demo", 2, true, null]', "ARGV"), ["demo", "2", "true", ""]);
});

test("redis lua helper rejects non-array JSON payloads", () => {
  assert.throws(() => parseRedisLuaArrayInput('{"foo":"bar"}', "KEYS"), /KEYS 必须是 JSON 数组/);
});

test("redis lua helper exposes stable defaults and result formatting", () => {
  assert.equal(DEFAULT_REDIS_LUA_EXECUTION_MODE, "proxy");
  assert.equal(DEFAULT_REDIS_LUA_REDIS_URL, "redis://127.0.0.1:6379/0");
  assert.deepEqual(createDefaultRedisLuaHistoryState(), {
    redisUrl: "redis://127.0.0.1:6379/0",
    keysText: '[\n  "demo:key"\n]',
    argvText: '[\n  "demo-value"\n]',
    executionMode: "proxy",
  });
  assert.equal(
    formatRedisLuaDebugResponse({
      success: true,
      mode: "proxy",
      resultPreview: "demo-value",
      error: null,
      trace: [{ index: 1, command: "GET", args: ["demo:key"], durationMs: 1, ok: true, replyPreview: "demo", error: null }],
      logs: [],
    }),
    '{\n  "success": true,\n  "mode": "proxy",\n  "error": null,\n  "result": "demo-value",\n  "traceCount": 1,\n  "logCount": 0\n}',
  );
});

test("redis lua workspace panel exposes redis config and trace sections", () => {
  assert.match(workspacePanel, /const isRedisLuaTool = computed/);
  assert.match(workspacePanel, /Redis 地址/);
  assert.match(workspacePanel, /本地代理调试/);
  assert.match(workspacePanel, /真实 EVAL 校验/);
  assert.match(workspacePanel, /redis\.call 轨迹/);
  assert.match(workspacePanel, /脚本日志/);
});

test("redis lua workspace store tracks dedicated state and invokes tauri command", () => {
  assert.match(workspaceStore, /const redisLuaRedisUrl = ref/);
  assert.match(workspaceStore, /const redisLuaExecutionMode = ref<RedisLuaExecutionMode>/);
  assert.match(workspaceStore, /const redisLuaLastResponse = ref<RedisLuaDebugResponse \| null>/);
  assert.match(workspaceStore, /await invokeRedisLuaDebug\(/);
  assert.match(workspaceStore, /parseRedisLuaArrayInput\(redisLuaKeysText\.value, "KEYS"\)/);
});

test("redis lua UI is promoted from home and has a dedicated execute label", () => {
  assert.match(homeView, /打开 Redis Lua 调试台/);
  assert.match(actionBar, /runButtonLabel/);
  assert.match(actionBar, /执行调试/);
  assert.match(appVue, /搜索 Redis Lua、JSON、时间戳、URL、JWT/);
  assert.match(appVue, /redis-config-grid/);
});
