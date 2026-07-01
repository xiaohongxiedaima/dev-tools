import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  AUTO_HISTORY_LIMIT,
  MANUAL_HISTORY_LIMIT,
  buildHistoryPreview,
  createHistorySnapshot,
  isSameHistorySnapshot,
} from "../src/lib/workspace-history.ts";
import { createDatabaseApi } from "../src/lib/database.ts";

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
    options: { jsonAction: "format" },
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
    options: { jsonAction: "minify" },
    viewState: {
      jsonOutputMode: "tree",
      jsonTreeDepth: 2,
    },
  });

  assert.equal(isSameHistorySnapshot(left, right), true);
  assert.equal(isSameHistorySnapshot(left, changed), false);
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
    options: { jsonAction: "sort", liveMode: false },
    viewState: { jsonOutputMode: "tree", jsonTreeDepth: 3, jsonTreeCollapsedNodeLength: 4 },
  });

  assert.deepEqual(snapshot, {
    toolId: "json-formatter",
    inputValue: '{"a":1}',
    outputValue: '{\n  "a": 1\n}',
    savedAt: "",
    options: { jsonAction: "sort", liveMode: false },
    viewState: { jsonOutputMode: "tree", jsonTreeDepth: 3, jsonTreeCollapsedNodeLength: 4 },
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
