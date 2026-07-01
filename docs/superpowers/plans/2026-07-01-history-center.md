# History Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the right-side status panel with a persistent, cross-tool history center that supports manual saves, debounced automatic input history, and full workspace-state restore.

**Architecture:** Keep persistence in SQLite, keep workspace snapshot orchestration in the Pinia store, and keep rendering in the existing workspace components. Extract history-specific snapshot and list helpers into a small library module so restore, deduplication, and preview generation stay testable without growing `workspace.ts` further.

**Tech Stack:** Vue 3, Pinia, TypeScript, Tauri SQL plugin, SQLite, Node test runner

---

## File Structure

### Create

- `src/lib/workspace-history.ts` — history entry types, snapshot serialization helpers, preview-title helpers, auto-history deduplication helpers, and retention constants.
- `tests/workspace-history.test.mjs` — focused unit tests for history helpers and store-facing snapshot rules.
- `docs/superpowers/plans/2026-07-01-history-center.md` — this implementation plan.

### Modify

- `src/lib/database.ts` — add history table bootstrap plus CRUD helpers for listing, inserting, trimming, and deleting older history rows.
- `src/stores/workspace.ts` — add history state, debounced auto-save flow, manual save action, restore action, and inspector-section defaults.
- `src/components/workspace/ToolActionBar.vue` — add the shared “保存历史” entry point.
- `src/components/workspace/WorkspaceInspector.vue` — replace the old status section with grouped manual/auto history lists and restore actions.
- `src/App.vue` — add styles for the history center layout, history cards, empty states, and restore affordances.
- `src/lib/tools.ts` — remove right-panel copy that still references the old status panel.
- `tests/json-tool-actions.test.mjs` — extend UI regression coverage for the save button, history panel copy, and status-panel removal.

### Existing Commands

- Targeted tests: `node --test tests/workspace-history.test.mjs tests/json-tool-actions.test.mjs`
- Build check: `npm run build`

---

### Task 1: Add history persistence and pure helper coverage

**Files:**
- Create: `src/lib/workspace-history.ts`
- Create: `tests/workspace-history.test.mjs`
- Modify: `src/lib/database.ts`

- [ ] **Step 1: Write the failing history-helper tests**

Add focused tests for preview generation, deduplication, and snapshot defaults in `tests/workspace-history.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_HISTORY_LIMIT,
  MANUAL_HISTORY_LIMIT,
  buildHistoryPreview,
  createHistorySnapshot,
  isSameHistorySnapshot,
} from "../src/lib/workspace-history.ts";

test("history uses input preview before output preview", () => {
  assert.equal(buildHistoryPreview("hello world", "ignored"), "hello world");
  assert.equal(buildHistoryPreview("", "fallback output"), "fallback output");
});

test("history preview is trimmed to a single readable line", () => {
  assert.equal(buildHistoryPreview("line 1\\nline 2", ""), "line 1 line 2");
});

test("snapshot comparison ignores timestamps but keeps tool state", () => {
  const first = {
    toolId: "json-formatter",
    inputValue: '{"a":1}',
    outputValue: '{\\n  "a": 1\\n}',
    options: { jsonAction: "format" },
    viewState: { jsonOutputMode: "text" },
    savedAt: "2026-07-01T00:00:00.000Z",
  };
  const second = {
    ...first,
    savedAt: "2026-07-01T00:00:01.000Z",
  };
  const changed = {
    ...first,
    viewState: { jsonOutputMode: "tree" },
  };

  assert.equal(isSameHistorySnapshot(first, second), true);
  assert.equal(isSameHistorySnapshot(first, changed), false);
});

test("history retention constants match the approved design", () => {
  assert.equal(AUTO_HISTORY_LIMIT, 50);
  assert.equal(MANUAL_HISTORY_LIMIT, 200);
});

test("snapshot builder stores current tool, output, and option state", () => {
  assert.deepEqual(
    createHistorySnapshot({
      toolId: "json-formatter",
      inputValue: '{"b":2}',
      outputValue: '{"b":2}',
      jsonAction: "minify",
      jsonOutputMode: "tree",
      jsonTreeDepth: Number.POSITIVE_INFINITY,
      jsonTreeCollapsedNodeLength: Number.POSITIVE_INFINITY,
      liveMode: true,
    }),
    {
      toolId: "json-formatter",
      inputValue: '{"b":2}',
      outputValue: '{"b":2}',
      options: { jsonAction: "minify", liveMode: true },
      viewState: {
        jsonOutputMode: "tree",
        jsonTreeDepth: Number.POSITIVE_INFINITY,
        jsonTreeCollapsedNodeLength: Number.POSITIVE_INFINITY,
      },
      savedAt: "",
    },
  );
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
node --test tests/workspace-history.test.mjs
```

Expected: FAIL with `Cannot find module '../src/lib/workspace-history.ts'` and missing export errors.

- [ ] **Step 3: Write the helper module and database API**

Create `src/lib/workspace-history.ts`:

```ts
export const AUTO_HISTORY_LIMIT = 50;
export const MANUAL_HISTORY_LIMIT = 200;

export type WorkspaceHistorySource = "manual" | "auto";

export type WorkspaceHistorySnapshot = {
  toolId: string;
  inputValue: string;
  outputValue: string;
  options: {
    jsonAction?: "format" | "minify" | "sort";
    liveMode?: boolean;
  };
  viewState: {
    jsonOutputMode?: "text" | "tree";
    jsonTreeDepth?: number;
    jsonTreeCollapsedNodeLength?: number;
  };
  savedAt: string;
};

export function buildHistoryPreview(inputValue: string, outputValue: string): string {
  const source = (inputValue || outputValue).replace(/\s+/g, " ").trim();
  return source.slice(0, 80);
}

export function createHistorySnapshot(input: {
  toolId: string;
  inputValue: string;
  outputValue: string;
  jsonAction: "format" | "minify" | "sort";
  jsonOutputMode: "text" | "tree";
  jsonTreeDepth: number;
  jsonTreeCollapsedNodeLength: number;
  liveMode: boolean;
}): WorkspaceHistorySnapshot {
  return {
    toolId: input.toolId,
    inputValue: input.inputValue,
    outputValue: input.outputValue,
    options: {
      jsonAction: input.jsonAction,
      liveMode: input.liveMode,
    },
    viewState: {
      jsonOutputMode: input.jsonOutputMode,
      jsonTreeDepth: input.jsonTreeDepth,
      jsonTreeCollapsedNodeLength: input.jsonTreeCollapsedNodeLength,
    },
    savedAt: "",
  };
}

export function isSameHistorySnapshot(
  left: WorkspaceHistorySnapshot,
  right: WorkspaceHistorySnapshot,
): boolean {
  const { savedAt: _leftSavedAt, ...leftComparable } = left;
  const { savedAt: _rightSavedAt, ...rightComparable } = right;
  return JSON.stringify(leftComparable) === JSON.stringify(rightComparable);
}
```

Extend `src/lib/database.ts` with a history record type plus persistence helpers:

```ts
export type WorkspaceHistoryRecord = {
  id: number;
  tool_id: string;
  source_type: "manual" | "auto";
  title: string;
  input_value: string;
  output_value: string;
  snapshot_json: string;
  created_at: string;
  updated_at: string;
};

await db.execute(`
  CREATE TABLE IF NOT EXISTS workspace_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_id TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'auto')),
    title TEXT NOT NULL,
    input_value TEXT NOT NULL,
    output_value TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

export async function insertWorkspaceHistoryRecord(input: {
  toolId: string;
  sourceType: "manual" | "auto";
  title: string;
  inputValue: string;
  outputValue: string;
  snapshotJson: string;
  createdAt: string;
}): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO workspace_history
       (tool_id, source_type, title, input_value, output_value, snapshot_json, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
    [input.toolId, input.sourceType, input.title, input.inputValue, input.outputValue, input.snapshotJson, input.createdAt],
  );
}

export async function loadWorkspaceHistoryRecords(): Promise<WorkspaceHistoryRecord[]> {
  const db = await getDatabase();
  return db.select<WorkspaceHistoryRecord[]>(
    `SELECT id, tool_id, source_type, title, input_value, output_value, snapshot_json, created_at, updated_at
       FROM workspace_history
      ORDER BY datetime(created_at) DESC, id DESC`,
  );
}

export async function trimWorkspaceHistory(sourceType: "manual" | "auto", keepCount: number): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `DELETE FROM workspace_history
      WHERE source_type = $1
        AND id NOT IN (
          SELECT id
            FROM workspace_history
           WHERE source_type = $1
           ORDER BY datetime(created_at) DESC, id DESC
           LIMIT $2
        )`,
    [sourceType, keepCount],
  );
}
```

- [ ] **Step 4: Run the focused tests again**

Run:

```bash
node --test tests/workspace-history.test.mjs
```

Expected: PASS for the new helper tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/workspace-history.ts src/lib/database.ts tests/workspace-history.test.mjs
git commit -m "feat: add workspace history persistence helpers" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Add history state and restore flow to the workspace store

**Files:**
- Modify: `src/stores/workspace.ts`
- Modify: `src/lib/workspace-history.ts`
- Modify: `tests/workspace-history.test.mjs`

- [ ] **Step 1: Write the failing store-oriented tests**

Extend `tests/workspace-history.test.mjs` with string-level store assertions:

```js
import { readFileSync } from "node:fs";

const workspaceStoreSource = readFileSync(new URL("../src/stores/workspace.ts", import.meta.url), "utf8");

test("workspace store tracks manual and auto history separately", () => {
  assert.match(workspaceStoreSource, /const manualHistory = ref/);
  assert.match(workspaceStoreSource, /const autoHistory = ref/);
  assert.match(workspaceStoreSource, /const lastAutoHistorySnapshot = ref/);
});

test("workspace store exposes save and restore history actions", () => {
  assert.match(workspaceStoreSource, /async function saveCurrentHistoryEntry\(/);
  assert.match(workspaceStoreSource, /async function restoreHistoryEntry\(/);
  assert.match(workspaceStoreSource, /function queueAutoHistorySave\(/);
});

test("restoring history applies saved tool and view state", () => {
  assert.match(workspaceStoreSource, /activeToolId\.value = snapshot\.toolId/);
  assert.match(workspaceStoreSource, /inputValue\.value = snapshot\.inputValue/);
  assert.match(workspaceStoreSource, /manualOutput\.value = snapshot\.outputValue/);
  assert.match(workspaceStoreSource, /jsonOutputMode\.value = snapshot\.viewState\.jsonOutputMode \?\? "text"/);
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
node --test tests/workspace-history.test.mjs
```

Expected: FAIL because the new store state and actions do not exist yet.

- [ ] **Step 3: Implement the store history flow**

Update `src/stores/workspace.ts` to import the new database and helper functions, add in-memory grouped lists, and debounce auto history writes:

```ts
import {
  AUTO_HISTORY_LIMIT,
  MANUAL_HISTORY_LIMIT,
  buildHistoryPreview,
  createHistorySnapshot,
  isSameHistorySnapshot,
  type WorkspaceHistorySnapshot,
} from "../lib/workspace-history";
import {
  insertWorkspaceHistoryRecord,
  loadWorkspaceHistoryRecords,
  trimWorkspaceHistory,
  type WorkspaceHistoryRecord,
} from "../lib/database";

const manualHistory = ref<WorkspaceHistoryRecord[]>([]);
const autoHistory = ref<WorkspaceHistoryRecord[]>([]);
const lastAutoHistorySnapshot = ref<WorkspaceHistorySnapshot | null>(null);
let autoHistoryTimer: number | undefined;

function applyToolDefaults(toolId: string) {
  if (toolId === "json-formatter") {
    jsonAction.value = "format";
    jsonOutputMode.value = "text";
    jsonTreeDepth.value = Number.POSITIVE_INFINITY;
    jsonTreeCollapsedNodeLength.value = Number.POSITIVE_INFINITY;
  }
}

function createCurrentSnapshot(): WorkspaceHistorySnapshot {
  const snapshot = createHistorySnapshot({
    toolId: activeToolId.value,
    inputValue: inputValue.value,
    outputValue: outputPreview.value,
    jsonAction: jsonAction.value,
    jsonOutputMode: jsonOutputMode.value,
    jsonTreeDepth: jsonTreeDepth.value,
    jsonTreeCollapsedNodeLength: jsonTreeCollapsedNodeLength.value,
    liveMode: liveMode.value,
  });
  snapshot.savedAt = new Date().toISOString();
  return snapshot;
}

async function reloadWorkspaceHistory() {
  const rows = await loadWorkspaceHistoryRecords();
  manualHistory.value = rows.filter((row) => row.source_type === "manual");
  autoHistory.value = rows.filter((row) => row.source_type === "auto");
}

async function saveHistorySnapshot(sourceType: "manual" | "auto") {
  const snapshot = createCurrentSnapshot();
  if (sourceType === "auto" && lastAutoHistorySnapshot.value && isSameHistorySnapshot(lastAutoHistorySnapshot.value, snapshot)) {
    return;
  }

  await insertWorkspaceHistoryRecord({
    toolId: snapshot.toolId,
    sourceType,
    title: buildHistoryPreview(snapshot.inputValue, snapshot.outputValue) || activeTool.value.name,
    inputValue: snapshot.inputValue,
    outputValue: snapshot.outputValue,
    snapshotJson: JSON.stringify(snapshot),
    createdAt: snapshot.savedAt,
  });
  await trimWorkspaceHistory(sourceType, sourceType === "manual" ? MANUAL_HISTORY_LIMIT : AUTO_HISTORY_LIMIT);
  if (sourceType === "auto") {
    lastAutoHistorySnapshot.value = snapshot;
  }
  await reloadWorkspaceHistory();
}

async function saveCurrentHistoryEntry() {
  await saveHistorySnapshot("manual");
}

function queueAutoHistorySave() {
  window.clearTimeout(autoHistoryTimer);
  autoHistoryTimer = window.setTimeout(() => {
    void saveHistorySnapshot("auto");
  }, 800);
}

async function restoreHistoryEntry(entry: WorkspaceHistoryRecord) {
  const snapshot = JSON.parse(entry.snapshot_json) as WorkspaceHistorySnapshot;
  const tool = getTool(snapshot.toolId);
  if (!tool) {
    throw new Error(`历史记录引用了不存在的工具：${snapshot.toolId}`);
  }
  activeToolId.value = snapshot.toolId;
  applyToolDefaults(snapshot.toolId);
  inputValue.value = snapshot.inputValue;
  manualOutput.value = snapshot.outputValue;
  liveMode.value = snapshot.options.liveMode ?? true;
  jsonAction.value = snapshot.options.jsonAction ?? "format";
  jsonOutputMode.value = snapshot.viewState.jsonOutputMode ?? "text";
  jsonTreeDepth.value = snapshot.viewState.jsonTreeDepth ?? Number.POSITIVE_INFINITY;
  jsonTreeCollapsedNodeLength.value =
    snapshot.viewState.jsonTreeCollapsedNodeLength ?? Number.POSITIVE_INFINITY;
  rememberTool(snapshot.toolId);
}
```

Also update existing flows so they use `applyToolDefaults(tool.id)` inside `setActiveTool`, initialize `openInspectorSections` with `["manual-history", "auto-history", "recent", "favorites", "presets", "tips"]`, call `reloadWorkspaceHistory()` from `bootstrapWorkspace()`, and call `queueAutoHistorySave()` from `setInputValue(value)` after `inputValue.value = value`.

- [ ] **Step 4: Run the store-focused tests**

Run:

```bash
node --test tests/workspace-history.test.mjs
```

Expected: PASS for helper tests and new store assertions.

- [ ] **Step 5: Commit**

```bash
git add src/stores/workspace.ts src/lib/workspace-history.ts tests/workspace-history.test.mjs
git commit -m "feat: wire workspace history into store state" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Add the shared save action and replace the status panel with history groups

**Files:**
- Modify: `src/components/workspace/ToolActionBar.vue`
- Modify: `src/components/workspace/WorkspaceInspector.vue`
- Modify: `src/App.vue`
- Modify: `tests/json-tool-actions.test.mjs`

- [ ] **Step 1: Write the failing UI regression tests**

Extend `tests/json-tool-actions.test.mjs`:

```js
test("toolbar exposes a shared save-history action", () => {
  assert.match(actionBar, />\\s*保存历史\\s*</);
});

test("workspace inspector replaces status panel with grouped history sections", () => {
  const inspector = readFileSync(new URL("../src/components/workspace/WorkspaceInspector.vue", import.meta.url), "utf8");
  assert.doesNotMatch(inspector, /状态面板/);
  assert.match(inspector, /手动保存/);
  assert.match(inspector, /自动输入历史/);
  assert.match(inspector, /restoreHistoryEntry/);
});

test("workspace styles include history center hooks", () => {
  assert.match(appCss, /history-list/);
  assert.match(appCss, /history-card/);
});
```

- [ ] **Step 2: Run the targeted UI tests to verify they fail**

Run:

```bash
node --test tests/json-tool-actions.test.mjs
```

Expected: FAIL because the save button, history-group labels, and new style hooks are not present yet.

- [ ] **Step 3: Implement the shared action and history-center UI**

Update `src/components/workspace/ToolActionBar.vue`:

```vue
<template>
  <div class="workspace-toolbar">
    <button class="ghost-button" type="button" @click="workspaceStore.saveCurrentHistoryEntry()">保存历史</button>
    <button class="ghost-button" type="button" @click="workspaceStore.setInputValue('')">清空</button>
    <button class="ghost-button" type="button" @click="workspaceStore.swapInputAndOutputPreview()">交换输入输出</button>
    <button v-if="!workspaceStore.liveMode" class="primary-button" type="button" @click="workspaceStore.runCurrentTransform()">
      执行转换
    </button>
  </div>
</template>
```

Update `src/components/workspace/WorkspaceInspector.vue` to render grouped history cards and empty states:

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { getTool } from "../../lib/tools";
import { useWorkspaceStore } from "../../stores/workspace";

const router = useRouter();
const workspaceStore = useWorkspaceStore();
const manualHistory = computed(() => workspaceStore.manualHistory);
const autoHistory = computed(() => workspaceStore.autoHistory);

function getHistoryToolName(toolId: string) {
  return getTool(toolId)?.name ?? toolId;
}

async function restoreHistory(entry: (typeof workspaceStore.manualHistory)[number]) {
  await workspaceStore.restoreHistoryEntry(entry);
  void router.push({ name: "workspace", params: { toolId: workspaceStore.activeToolId } });
}
</script>

<template>
  <aside class="inspector shell-card">
    <section class="inspector-section">
      <button class="inspector-toggle" type="button" @click="workspaceStore.toggleInspectorSection('manual-history')">
        <span>手动保存</span>
        <span>{{ workspaceStore.isInspectorSectionOpen("manual-history") ? "收起" : "展开" }}</span>
      </button>
      <div v-if="workspaceStore.isInspectorSectionOpen('manual-history')" class="inspector-body">
        <div v-if="manualHistory.length" class="history-list">
          <button v-for="entry in manualHistory" :key="entry.id" class="history-card" type="button" @click="restoreHistory(entry)">
            <strong>{{ entry.title }}</strong>
            <span>{{ getHistoryToolName(entry.tool_id) }}</span>
            <time>{{ entry.created_at }}</time>
          </button>
        </div>
        <p v-else class="empty-state">还没有手动保存的历史记录。</p>
      </div>
    </section>

    <section class="inspector-section">
      <button class="inspector-toggle" type="button" @click="workspaceStore.toggleInspectorSection('auto-history')">
        <span>自动输入历史</span>
        <span>{{ workspaceStore.isInspectorSectionOpen("auto-history") ? "收起" : "展开" }}</span>
      </button>
      <div v-if="workspaceStore.isInspectorSectionOpen('auto-history')" class="inspector-body">
        <div v-if="autoHistory.length" class="history-list">
          <button v-for="entry in autoHistory" :key="entry.id" class="history-card" type="button" @click="restoreHistory(entry)">
            <strong>{{ entry.title }}</strong>
            <span>{{ getHistoryToolName(entry.tool_id) }}</span>
            <time>{{ entry.created_at }}</time>
          </button>
        </div>
        <p v-else class="empty-state">输入内容会在停顿后自动记录到这里。</p>
      </div>
    </section>
  </aside>
</template>
```

Add supporting styles in `src/App.vue`:

```css
.history-list {
  display: grid;
  gap: 0.75rem;
}

.history-card {
  display: grid;
  gap: 0.35rem;
  width: 100%;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.72);
  color: inherit;
  text-align: left;
}

.history-card time,
.history-card span {
  color: rgba(148, 163, 184, 0.88);
  font-size: 0.83rem;
}

.empty-state {
  margin: 0;
  color: rgba(148, 163, 184, 0.88);
}
```

- [ ] **Step 4: Run the UI regression tests again**

Run:

```bash
node --test tests/json-tool-actions.test.mjs
```

Expected: PASS for the history-center UI assertions without regressing earlier JSON workspace checks.

- [ ] **Step 5: Commit**

```bash
git add src/components/workspace/ToolActionBar.vue src/components/workspace/WorkspaceInspector.vue src/App.vue tests/json-tool-actions.test.mjs
git commit -m "feat: replace status panel with history center" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Finish integration details, clean old copy, and run end-to-end verification

**Files:**
- Modify: `src/lib/tools.ts`
- Modify: `src/stores/workspace.ts`
- Modify: `tests/json-tool-actions.test.mjs`
- Modify: `tests/workspace-history.test.mjs`

- [ ] **Step 1: Write the final failing integration assertions**

Add the final checks needed for restore-safe behavior:

```js
test("workspace copy no longer references the old status panel guidance", () => {
  const toolsSource = readFileSync(new URL("../src/lib/tools.ts", import.meta.url), "utf8");
  assert.doesNotMatch(toolsSource, /状态面板/);
});

test("tool workspace keeps existing output controls while save-history lives in the shared toolbar", () => {
  assert.match(workspacePanel, /copyOutput/);
  assert.match(workspacePanel, /树状视图/);
  assert.doesNotMatch(workspacePanel, />\\s*保存历史\\s*</);
});

test("workspace bootstrap loads history records", () => {
  const workspaceStoreSource = readFileSync(new URL("../src/stores/workspace.ts", import.meta.url), "utf8");
  assert.match(workspaceStoreSource, /await reloadWorkspaceHistory\(\)/);
});
```

- [ ] **Step 2: Run the combined targeted tests to verify they fail**

Run:

```bash
node --test tests/workspace-history.test.mjs tests/json-tool-actions.test.mjs
```

Expected: FAIL until the copy cleanup and bootstrap integration are in place.

- [ ] **Step 3: Implement the cleanup and integration**

Update `src/lib/tools.ts` to replace the outdated tip:

```ts
export const workspaceTips = [
  "把格式化、压缩、复制、交换输入输出统一放在工具操作条里。",
  "输入区默认实时转换，复杂工具支持切换为手动执行。",
  "右侧历史中心专门放手动保存和自动输入历史，避免挤占主工作区。",
];
```

Make sure `src/stores/workspace.ts` bootstraps history alongside presets:

```ts
async function bootstrapWorkspace() {
  if (isInitializing.value) {
    return;
  }

  isInitializing.value = true;
  errorMessage.value = "";

  try {
    await initializeDatabase();
    await Promise.all([refreshPresets(), reloadWorkspaceHistory()]);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    isInitializing.value = false;
    isLoading.value = false;
  }
}
```

- [ ] **Step 4: Run the full targeted verification and build**

Run:

```bash
node --test tests/workspace-history.test.mjs tests/json-tool-actions.test.mjs
npm run build
```

Expected:

- `node --test ...` reports all targeted tests passing
- `npm run build` completes successfully (bundle-size warning is acceptable if unchanged)

- [ ] **Step 5: Commit**

```bash
git add src/lib/tools.ts src/stores/workspace.ts tests/json-tool-actions.test.mjs tests/workspace-history.test.mjs
git commit -m "feat: finish history center integration" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Self-Review Checklist

- Spec coverage: tasks cover persistence, manual and auto history groups, full snapshot restore, status-panel removal, restore failures, and persistence across app restarts.
- Placeholder scan: no TODO/TBD markers remain; limits, debounce interval, commands, and file paths are explicit.
- Type consistency: `WorkspaceHistorySnapshot`, `WorkspaceHistoryRecord`, `saveCurrentHistoryEntry`, `restoreHistoryEntry`, and `queueAutoHistorySave` are named consistently across tasks.
