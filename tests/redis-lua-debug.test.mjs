import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_REDIS_LUA_EXECUTION_MODE,
  DEFAULT_REDIS_LUA_REDIS_URL,
  createDefaultRedisLuaHistoryState,
  parseRedisLuaArrayInput,
} from "../src/lib/redis-lua-debug.ts";

const toolsSource = readFileSync(new URL("../src/lib/tools.ts", import.meta.url), "utf8");
const toolWorkspacePanel = readFileSync(new URL("../src/components/workspace/ToolWorkspacePanel.vue", import.meta.url), "utf8");
const redisWorkspacePanel = readFileSync(new URL("../src/components/workspace/RedisLuaToolWorkspacePanel.vue", import.meta.url), "utf8");
const workspacePanel = `${toolWorkspacePanel}\n${redisWorkspacePanel}`;
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

test("redis lua helper parses whitespace-separated values into string arguments", () => {
  assert.deepEqual(parseRedisLuaArrayInput("demo 2 true", "ARGV"), ["demo", "2", "true"]);
});

test("redis lua helper keeps quoted segments with spaces as single argument", () => {
  assert.deepEqual(
    parseRedisLuaArrayInput('{"hello": "world", "b": "b"}', "ARGV"),
    ['{"hello": "world", "b": "b"}'],
  );
  assert.deepEqual(
    parseRedisLuaArrayInput(`key1 '{"json": "value"}' key2`, "ARGV"),
    ["key1", '{"json": "value"}', "key2"],
  );
  assert.deepEqual(
    parseRedisLuaArrayInput('[1, 2, 3] other', "ARGV"),
    ["[1, 2, 3]", "other"],
  );
});

test("redis lua helper returns empty array for blank input", () => {
  assert.deepEqual(parseRedisLuaArrayInput("", "KEYS"), []);
});

test("redis lua helper exposes stable defaults", () => {
  assert.equal(DEFAULT_REDIS_LUA_EXECUTION_MODE, "proxy");
  assert.equal(DEFAULT_REDIS_LUA_REDIS_URL, "redis://127.0.0.1:6379/0");
  assert.deepEqual(createDefaultRedisLuaHistoryState(), {
    redisUrl: "redis://127.0.0.1:6379/0",
    keysText: "",
    argvText: "",
    executionMode: "proxy",
  });
});

test("redis lua helper parses ARGV JSON strings", () => {
  assert.deepEqual(parseRedisLuaArrayInput('{"hello": "world", "b": "b"}', "ARGV"), ['{"hello": "world", "b": "b"}']);
});

test("redis lua workspace panel exposes redis config and trace sections", () => {
  assert.match(toolWorkspacePanel, /import RedisLuaToolWorkspacePanel from "\.\/RedisLuaToolWorkspacePanel\.vue"/);
  assert.match(toolWorkspacePanel, /case "redis-lua-debug-console":/);
  assert.match(workspacePanel, /Redis 地址/);
  assert.match(workspacePanel, /本地代理调试/);
  assert.match(workspacePanel, /真实 EVAL 校验/);
  assert.match(workspacePanel, /Trace/);
  assert.match(workspacePanel, /脚本日志/);
});

test("redis lua workspace store tracks dedicated state and invokes tauri command", () => {
  const redisLuaStore = readFileSync(new URL("../src/stores/redisLua.ts", import.meta.url), "utf8");
  assert.match(redisLuaStore, /const redisLuaRedisUrl = ref/);
  assert.match(redisLuaStore, /const redisLuaExecutionMode = ref<RedisLuaExecutionMode>/);
  assert.match(redisLuaStore, /const redisLuaLastResponse = ref<RedisLuaDebugResponse \| null>/);
  assert.match(workspaceStore, /await invokeRedisLuaDebug\(/);
  assert.match(workspaceStore, /parseRedisLuaArrayInput\(redisLuaStore\.redisLuaKeysText, "KEYS"\)/);
});

test("redis lua UI is promoted from home and has a dedicated execute label", () => {
  assert.match(homeView, /打开 Redis Lua 调试台/);
  assert.match(redisWorkspacePanel, /label: redisLuaStore\.redisLuaIsRunning \? "执行中\.\.\." : "执行调试"/);
  assert.match(redisWorkspacePanel, /执行调试/);
  assert.match(redisWorkspacePanel, /<WorkspaceActionRow :items="inputPrimaryActionItems" \/>/);
  assert.match(redisWorkspacePanel, /<WorkspaceActionRow :items="inputSecondaryActionItems" grouped \/>/);
  assert.match(redisWorkspacePanel, /Trace/);
  assert.match(redisWorkspacePanel, /脚本日志/);
  assert.match(redisWorkspacePanel, /<div class="workspace-action-bar[^"]*">/);
  assert.match(appVue, /redis-config-grid/);
});
