import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AUTO_HISTORY_LIMIT,
  MANUAL_HISTORY_LIMIT,
  buildHistoryPreview,
  createHistorySnapshot,
  isSameHistorySnapshot,
} from "../src/lib/workspace-history.ts";

const databaseSource = readFileSync(new URL("../src/lib/database.ts", import.meta.url), "utf8");

test("preview uses input text before output text", () => {
  assert.equal(buildHistoryPreview("  input text  ", "output text"), "input text");
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

test("database source declares workspace history persistence", () => {
  assert.match(databaseSource, /CREATE TABLE IF NOT EXISTS workspace_history/);
  assert.match(databaseSource, /export type WorkspaceHistoryRecord/);
  assert.match(databaseSource, /export async function insertWorkspaceHistoryRecord/);
  assert.match(databaseSource, /export async function loadWorkspaceHistoryRecords/);
  assert.match(databaseSource, /export async function trimWorkspaceHistory/);
});
