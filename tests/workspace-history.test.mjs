import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  AUTO_HISTORY_LIMIT,
  MANUAL_HISTORY_LIMIT,
  buildHistoryPreview,
  createHistorySnapshot,
  isSameHistorySnapshot,
  parseWorkspaceHistorySnapshot,
} from "../src/lib/workspace-history.ts";
import { createDatabaseApi } from "../src/lib/database.ts";

const workspaceStore = readFileSync(new URL("../src/stores/workspace.ts", import.meta.url), "utf8");

function createSqliteAdapter() {
  const database = new DatabaseSync(":memory:");

  return {
    database,
    adapter: {
      async execute(sql, params = []) {
        database.prepare(sql.replaceAll(/\$(\d+)/g, "?$1")).run(...params);
      },
      async select(sql, params = []) {
        return database.prepare(sql.replaceAll(/\$(\d+)/g, "?$1")).all(...params);
      },
    },
  };
}

function createHistoryRecord(overrides = {}) {
  return {
    tool_id: "json-formatter",
    source_type: "manual",
    title: "Format JSON",
    input_value: '{"a":1}',
    output_value: '{\n  "a": 1\n}',
    snapshot_json: '{"toolId":"json-formatter"}',
    created_at: "2026-07-01T09:00:00.000Z",
    ...overrides,
  };
}

test("preview uses input text before output text", () => {
  assert.equal(buildHistoryPreview("  input text  ", "output text"), "input text");
});

test("preview falls back to output text when input is blank", () => {
  assert.equal(buildHistoryPreview("  \n\t", "  output text  "), "output text");
});

test("preview collapses whitespace and newlines into a single readable line", () => {
  assert.equal(
    buildHistoryPreview("  first line\n\nsecond\tline   ", "output"),
    "first line second line",
  );
});

test("snapshot comparison ignores timestamps but still detects tool-state changes", () => {
  const left = createHistorySnapshot({
    toolId: "json-formatter",
    inputValue: "input",
    outputValue: "output",
    options: { jsonMode: "format", jsonSortKeys: false },
    viewState: {
      jsonOutputMode: "tree",
      jsonTreeDepth: 2,
    },
  });
  const right = {
    ...left,
    savedAt: "2026-07-01T00:00:00.000Z",
  };
  const changed = createHistorySnapshot({
    toolId: "json-formatter",
    inputValue: "input",
    outputValue: "output",
    options: { jsonMode: "minify", jsonSortKeys: false },
    viewState: {
      jsonOutputMode: "tree",
      jsonTreeDepth: 2,
    },
  });

  assert.equal(isSameHistorySnapshot(left, right), true);
  assert.equal(isSameHistorySnapshot(left, changed), false);

  const base64Decode = createHistorySnapshot({
    toolId: "base64",
    inputValue: "aGVsbG8=",
    outputValue: "hello",
    options: { base64Mode: "decode" },
  });
  const base64Encode = createHistorySnapshot({
    toolId: "base64",
    inputValue: "hello",
    outputValue: "aGVsbG8=",
    options: { base64Mode: "encode" },
  });

  assert.equal(isSameHistorySnapshot(base64Decode, base64Encode), false);
});

test("retention constants stay fixed", () => {
  assert.equal(AUTO_HISTORY_LIMIT, 50);
  assert.equal(MANUAL_HISTORY_LIMIT, 200);
});

test("snapshot builder stores current workspace state", () => {
  const snapshot = createHistorySnapshot({
    toolId: "json-formatter",
    inputValue: '{"a":1}',
    outputValue: '{\n  "a": 1\n}',
    options: { jsonMode: "format", jsonSortKeys: true, liveMode: false },
    viewState: { jsonOutputMode: "tree", jsonTreeDepth: 3, jsonTreeCollapsedNodeLength: 4 },
  });

  assert.deepEqual(snapshot, {
    toolId: "json-formatter",
    inputValue: '{"a":1}',
    outputValue: '{\n  "a": 1\n}',
    savedAt: "",
    options: { jsonMode: "format", jsonSortKeys: true, liveMode: false },
    viewState: { jsonOutputMode: "tree", jsonTreeDepth: 3, jsonTreeCollapsedNodeLength: 4 },
    toolState: {},
  });
});

test("database initialization creates both tables and preserves seeded presets", async () => {
  const { adapter, database } = createSqliteAdapter();
  const api = createDatabaseApi({
    databaseUrl: "sqlite:test.db",
    loadDatabase: async () => adapter,
  });

  await api.initializeDatabase();
  await api.initializeDatabase();

  const tables = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => row.name);

  const presets = await api.loadCommandPresets();

  assert.deepEqual(tables, ["command_presets", "sqlite_sequence", "workspace_history"]);
  assert.deepEqual(
    presets.map(({ name, category, command, description }) => ({ name, category, command, description })),
    [
      {
        name: "Open SQLite shell",
        category: "Database",
        command: "sqlite3 ./data/dev.db",
        description: "Jump into a local SQLite database for ad-hoc inspection.",
      },
      {
        name: "API health check",
        category: "HTTP",
        command: "curl --fail --silent http://localhost:8080/health",
        description: "Quickly confirm the local backend is up before a dev session.",
      },
      {
        name: "Tail service log",
        category: "Logs",
        command: "tail -f ./logs/app.log",
        description: "Follow the main service log while testing requests or jobs.",
      },
    ],
  );
  assert.equal(presets.length, 3);
});

test("workspace history APIs insert load and trim records by source type", async () => {
  const { adapter } = createSqliteAdapter();
  const api = createDatabaseApi({
    databaseUrl: "sqlite:test.db",
    loadDatabase: async () => adapter,
  });

  await api.initializeDatabase();
  await api.insertWorkspaceHistoryRecord(createHistoryRecord({
    source_type: "manual",
    title: "Old manual",
    created_at: "2026-07-01T09:00:00.000Z",
    snapshot_json: '{"savedAt":"old-manual"}',
  }));
  await api.insertWorkspaceHistoryRecord(createHistoryRecord({
    source_type: "auto",
    title: "Old auto",
    created_at: "2026-07-01T09:01:00.000Z",
    snapshot_json: '{"savedAt":"old-auto"}',
  }));
  await api.insertWorkspaceHistoryRecord(createHistoryRecord({
    source_type: "auto",
    title: "New auto",
    created_at: "2026-07-01T09:02:00.000Z",
    snapshot_json: '{"savedAt":"new-auto"}',
  }));

  const beforeTrim = await api.loadWorkspaceHistoryRecords();

  assert.deepEqual(
    beforeTrim.map(({ title, source_type, created_at, snapshot_json }) => ({
      title,
      source_type,
      created_at,
      snapshot_json,
    })),
    [
      {
        title: "New auto",
        source_type: "auto",
        created_at: "2026-07-01T09:02:00.000Z",
        snapshot_json: '{"savedAt":"new-auto"}',
      },
      {
        title: "Old auto",
        source_type: "auto",
        created_at: "2026-07-01T09:01:00.000Z",
        snapshot_json: '{"savedAt":"old-auto"}',
      },
      {
        title: "Old manual",
        source_type: "manual",
        created_at: "2026-07-01T09:00:00.000Z",
        snapshot_json: '{"savedAt":"old-manual"}',
      },
    ],
  );
  assert.equal(beforeTrim[0].tool_id, "json-formatter");
  assert.equal(beforeTrim[0].input_value, '{"a":1}');
  assert.equal(beforeTrim[0].output_value, '{\n  "a": 1\n}');
  assert.equal(beforeTrim[1].updated_at, beforeTrim[1].created_at);

  await api.trimWorkspaceHistory("auto", 1);

  const afterTrim = await api.loadWorkspaceHistoryRecords();

  assert.deepEqual(
    afterTrim.map(({ title, source_type }) => ({ title, source_type })),
    [
      { title: "New auto", source_type: "auto" },
      { title: "Old manual", source_type: "manual" },
    ],
  );
});

test("workspace history insert defaults updated_at from created_at and accepts camelCase input", async () => {
  const { adapter } = createSqliteAdapter();
  const api = createDatabaseApi({
    databaseUrl: "sqlite:test.db",
    loadDatabase: async () => adapter,
  });

  await api.initializeDatabase();
  await api.insertWorkspaceHistoryRecord({
    toolId: "json-formatter",
    sourceType: "manual",
    title: "Camel case input",
    inputValue: '{"b":2}',
    outputValue: '{\n  "b": 2\n}',
    snapshotJson: '{"savedAt":"camel-case"}',
    createdAt: "2026-07-01T09:03:00.000Z",
  });

  const [record] = await api.loadWorkspaceHistoryRecords();

  assert.deepEqual({ ...record }, {
    id: 1,
    tool_id: "json-formatter",
    source_type: "manual",
    title: "Camel case input",
    input_value: '{"b":2}',
    output_value: '{\n  "b": 2\n}',
    snapshot_json: '{"savedAt":"camel-case"}',
    created_at: "2026-07-01T09:03:00.000Z",
    updated_at: "2026-07-01T09:03:00.000Z",
  });
});

test("workspace history APIs support deleting one record and clearing one source type for a tool", async () => {
  const { adapter } = createSqliteAdapter();
  const api = createDatabaseApi({
    databaseUrl: "sqlite:test.db",
    loadDatabase: async () => adapter,
  });

  await api.initializeDatabase();
  await api.insertWorkspaceHistoryRecord(createHistoryRecord({
    tool_id: "json-formatter",
    source_type: "manual",
    title: "Delete me",
    created_at: "2026-07-01T09:00:00.000Z",
  }));
  await api.insertWorkspaceHistoryRecord(createHistoryRecord({
    tool_id: "json-formatter",
    source_type: "manual",
    title: "Keep auto for now",
    created_at: "2026-07-01T09:01:00.000Z",
  }));
  await api.insertWorkspaceHistoryRecord(createHistoryRecord({
    tool_id: "json-formatter",
    source_type: "auto",
    title: "Clear me",
    created_at: "2026-07-01T09:02:00.000Z",
  }));
  await api.insertWorkspaceHistoryRecord(createHistoryRecord({
    tool_id: "timestamp",
    source_type: "auto",
    title: "Other tool auto",
    created_at: "2026-07-01T09:03:00.000Z",
  }));

  const beforeDelete = await api.loadWorkspaceHistoryRecords();
  const deleteTarget = beforeDelete.find((record) => record.title === "Delete me");
  assert.ok(deleteTarget);

  await api.deleteWorkspaceHistoryRecord(deleteTarget.id);

  const afterDelete = await api.loadWorkspaceHistoryRecords();
  assert.equal(afterDelete.some((record) => record.title === "Delete me"), false);

  await api.clearWorkspaceHistory("auto", "json-formatter");

  const afterClear = await api.loadWorkspaceHistoryRecords();
  assert.equal(afterClear.some((record) => record.title === "Clear me"), false);
  assert.equal(afterClear.some((record) => record.title === "Other tool auto"), true);
});

test("workspace history APIs can promote an existing record without inserting a duplicate", async () => {
  const { adapter } = createSqliteAdapter();
  const api = createDatabaseApi({
    databaseUrl: "sqlite:test.db",
    loadDatabase: async () => adapter,
  });

  await api.initializeDatabase();
  await api.insertWorkspaceHistoryRecord(createHistoryRecord({
    source_type: "auto",
    title: "Older auto",
    created_at: "2026-07-01T09:00:00.000Z",
  }));
  await api.insertWorkspaceHistoryRecord(createHistoryRecord({
    source_type: "auto",
    title: "Newer auto",
    created_at: "2026-07-01T09:01:00.000Z",
  }));

  const beforeTouch = await api.loadWorkspaceHistoryRecords();
  const olderAuto = beforeTouch.find((record) => record.title === "Older auto");
  assert.ok(olderAuto);
  assert.equal(beforeTouch.length, 2);

  await api.touchWorkspaceHistoryRecord(olderAuto.id, "2026-07-01T09:02:00.000Z");

  const afterTouch = await api.loadWorkspaceHistoryRecords();
  assert.equal(afterTouch.length, 2);
  assert.equal(afterTouch[0].title, "Older auto");
  assert.equal(afterTouch[0].created_at, "2026-07-01T09:02:00.000Z");
  assert.equal(afterTouch[0].updated_at, "2026-07-01T09:02:00.000Z");
});

test("workspace store declares separate manual and auto history state", () => {
  assert.match(workspaceStore, /const manualHistory = ref/);
  assert.match(workspaceStore, /const autoHistory = ref/);
  assert.match(workspaceStore, /const lastAutoHistorySnapshot = ref/);
  assert.match(workspaceStore, /const base64Mode = ref<Base64TransformMode>\("decode"\)/);
  assert.match(workspaceStore, /const inputShowLineNumbers = ref\(false\)/);
  assert.match(workspaceStore, /const outputShowLineNumbers = ref\(false\)/);
  assert.match(workspaceStore, /const inputSoftWrap = ref\(true\)/);
  assert.match(workspaceStore, /const outputSoftWrap = ref\(false\)/);
});

test("workspace store exposes history save restore and auto-save actions", () => {
  assert.match(workspaceStore, /async function saveCurrentHistoryEntry\(/);
  assert.match(workspaceStore, /async function restoreHistoryEntry\(/);
  assert.match(workspaceStore, /function saveAutoHistoryOnInputBlur\(/);
  assert.match(workspaceStore, /function findMatchingAutoHistoryRecord\(/);
  assert.match(workspaceStore, /async function deleteHistoryEntry\(/);
  assert.match(workspaceStore, /async function clearHistoryEntries\(/);
  assert.match(workspaceStore, /function setInputShowLineNumbers\(/);
  assert.match(workspaceStore, /function setOutputShowLineNumbers\(/);
  assert.match(workspaceStore, /function setInputSoftWrap\(/);
  assert.match(workspaceStore, /function setOutputSoftWrap\(/);
  assert.match(workspaceStore, /function setBase64Mode\(/);
});

test("workspace store uses a JSON default input value and skips auto-saving tool defaults", () => {
  assert.match(workspaceStore, /function getToolDefaultInputValue\(tool: ToolDefinition\)/);
  assert.match(
    workspaceStore,
    /if \(tool\.id === "json-formatter"\) \{\s*return "\{\}";\s*\}[\s\S]*return tool\.placeholder;/,
  );
  assert.match(workspaceStore, /const inputValue = ref\(getToolDefaultInputValue\(getTool\(defaultToolId\) \?\? tools\[0\]\)\)/);
  assert.match(
    workspaceStore,
    /sourceType === "auto"[\s\S]*snapshot\.inputValue === getToolDefaultInputValue\(getTool\(snapshot\.toolId\) \?\? activeTool\.value\)/,
  );
});

test("workspace store promotes existing auto history instead of inserting duplicates", () => {
  assert.match(workspaceStore, /const matchingRecord = findMatchingAutoHistoryRecord\(snapshot\)/);
  assert.match(workspaceStore, /await touchWorkspaceHistoryRecord\(matchingRecord\.id, new Date\(\)\.toISOString\(\)\)/);
  assert.match(workspaceStore, /if \(autoHistory\.value\[0\]\?\.id === matchingRecord\.id\) \{\s*return;\s*\}/);
});

test("workspace store restores snapshot fields back into live tool state", () => {
  assert.match(workspaceStore, /applyToolStateDefaults\(tool\);/);
  assert.match(workspaceStore, /activeToolId\.value = snapshot\.toolId/);
  assert.match(workspaceStore, /inputValue\.value = snapshot\.inputValue/);
  assert.match(
    workspaceStore,
    /manualOutput\.value =[\s\S]*snapshot\.toolId === "redis-lua-debug-console"[\s\S]*snapshot\.outputValue[\s\S]*snapshot\.toolId === "json-formatter"[\s\S]*snapshot\.outputValue[\s\S]*snapshot\.toolId === "base64"[\s\S]*snapshot\.outputValue[\s\S]*tool\.sampleOutput/,
  );
  assert.match(workspaceStore, /liveMode\.value = snapshot\.options\.liveMode \?\? tool\.id !== "redis-lua-debug-console"/);
  assert.match(workspaceStore, /inputShowLineNumbers\.value = snapshot\.viewState\.inputShowLineNumbers \?\? false/);
  assert.match(workspaceStore, /outputShowLineNumbers\.value = snapshot\.viewState\.outputShowLineNumbers \?\? false/);
  assert.match(workspaceStore, /inputSoftWrap\.value = snapshot\.viewState\.inputSoftWrap \?\? true/);
  assert.match(workspaceStore, /outputSoftWrap\.value = snapshot\.viewState\.outputSoftWrap \?\? false/);
  assert.match(workspaceStore, /jsonStore\.jsonMode = snapshot\.options\.jsonMode \?\? \(snapshot\.options\.jsonAction === "minify" \? "minify" : "format"\)/);
  assert.match(workspaceStore, /jsonStore\.jsonSortKeys = snapshot\.options\.jsonSortKeys \?\? snapshot\.options\.jsonAction === "sort"/);
  assert.match(workspaceStore, /base64Mode\.value = snapshot\.options\.base64Mode \?\? "decode"/);
  assert.doesNotMatch(workspaceStore, /jsonOutputMode\.value = snapshot\.viewState\.jsonOutputMode/);
});

test("workspace snapshots can carry redis lua tool state", () => {
  assert.match(workspaceStore, /toolState:\s*activeToolId\.value === "redis-lua-debug-console"/);
  assert.match(workspaceStore, /snapshot\.toolId === "redis-lua-debug-console" && snapshot\.toolState\.redisLua/);
  assert.match(workspaceStore, /redisLuaStore\.redisLuaExecutionMode = snapshot\.toolState\.redisLua\.executionMode/);
});

test("workspace bootstrap loads presets and history together", () => {
  assert.match(
    workspaceStore,
    /await Promise\.all\(\[refreshPresets\(\), reloadWorkspaceHistory\(\)\]\)|await refreshPresets\(\)[\s\S]*await reloadWorkspaceHistory\(\)/,
  );
});

test("workspace inspector opens manual and auto history sections by default", () => {
  assert.match(workspaceStore, /openInspectorSections = ref<string\[]>\(\[[\s\S]*"manual-history"[\s\S]*"auto-history"/);
});

test("history snapshot parser fills missing options and view state defaults", () => {
  assert.deepEqual(
    parseWorkspaceHistorySnapshot('{"toolId":"json-formatter","inputValue":"{}","outputValue":"{}","savedAt":"2026-07-01T09:00:00.000Z"}'),
    {
      toolId: "json-formatter",
      inputValue: "{}",
      outputValue: "{}",
      savedAt: "2026-07-01T09:00:00.000Z",
      options: {},
      viewState: {},
      toolState: {},
    },
  );
});

test("history snapshot parser rejects invalid payloads", () => {
  assert.throws(() => parseWorkspaceHistorySnapshot('{"toolId":null}'));
});
