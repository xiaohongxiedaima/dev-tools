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
    toolId: "json-formatter",
    sourceType: "manual",
    title: "Format JSON",
    inputValue: '{"a":1}',
    outputValue: '{\n  "a": 1\n}',
    snapshotJson: '{"toolId":"json-formatter"}',
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-01T09:00:00.000Z",
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
  const left = createHistorySnapshot("json-formatter", "input", "output", { jsonAction: "format" }, {
    jsonOutputMode: "tree",
    jsonTreeDepth: 2,
  });
  const right = {
    ...left,
    savedAt: "2026-07-01T00:00:00.000Z",
  };
  const changed = createHistorySnapshot("json-formatter", "input", "output", { jsonAction: "minify" }, {
    jsonOutputMode: "tree",
    jsonTreeDepth: 2,
  });

  assert.equal(isSameHistorySnapshot(left, right), true);
  assert.equal(isSameHistorySnapshot(left, changed), false);
});

test("retention constants stay fixed", () => {
  assert.equal(AUTO_HISTORY_LIMIT, 50);
  assert.equal(MANUAL_HISTORY_LIMIT, 200);
});

test("snapshot builder stores current workspace state", () => {
  const snapshot = createHistorySnapshot(
    "json-formatter",
    '{"a":1}',
    '{\n  "a": 1\n}',
    { jsonAction: "sort", liveMode: false },
    { jsonOutputMode: "tree", jsonTreeDepth: 3, jsonTreeCollapsedNodeLength: 4 },
  );

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
    sourceType: "manual",
    title: "Old manual",
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-01T09:00:00.000Z",
    snapshotJson: '{"savedAt":"old-manual"}',
  }));
  await api.insertWorkspaceHistoryRecord(createHistoryRecord({
    sourceType: "auto",
    title: "Old auto",
    createdAt: "2026-07-01T09:01:00.000Z",
    updatedAt: "2026-07-01T09:01:00.000Z",
    snapshotJson: '{"savedAt":"old-auto"}',
  }));
  await api.insertWorkspaceHistoryRecord(createHistoryRecord({
    sourceType: "auto",
    title: "New auto",
    createdAt: "2026-07-01T09:02:00.000Z",
    updatedAt: "2026-07-01T09:02:00.000Z",
    snapshotJson: '{"savedAt":"new-auto"}',
  }));

  const beforeTrim = await api.loadWorkspaceHistoryRecords();

  assert.deepEqual(
    beforeTrim.map(({ title, sourceType, createdAt, snapshotJson }) => ({
      title,
      sourceType,
      createdAt,
      snapshotJson,
    })),
    [
      {
        title: "New auto",
        sourceType: "auto",
        createdAt: "2026-07-01T09:02:00.000Z",
        snapshotJson: '{"savedAt":"new-auto"}',
      },
      {
        title: "Old auto",
        sourceType: "auto",
        createdAt: "2026-07-01T09:01:00.000Z",
        snapshotJson: '{"savedAt":"old-auto"}',
      },
      {
        title: "Old manual",
        sourceType: "manual",
        createdAt: "2026-07-01T09:00:00.000Z",
        snapshotJson: '{"savedAt":"old-manual"}',
      },
    ],
  );
  assert.equal(beforeTrim[0].toolId, "json-formatter");
  assert.equal(beforeTrim[0].inputValue, '{"a":1}');
  assert.equal(beforeTrim[0].outputValue, '{\n  "a": 1\n}');

  await api.trimWorkspaceHistory("auto", 1);

  const afterTrim = await api.loadWorkspaceHistoryRecords();

  assert.deepEqual(
    afterTrim.map(({ title, sourceType }) => ({ title, sourceType })),
    [
      { title: "New auto", sourceType: "auto" },
      { title: "Old manual", sourceType: "manual" },
    ],
  );
});
