import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  DATABASE_URL,
  clearWorkspaceHistory,
  deleteWorkspaceHistoryRecord,
  initializeDatabase,
  insertWorkspaceHistoryRecord,
  loadCommandPresets,
  loadWorkspaceHistoryRecords,
  touchWorkspaceHistoryRecord,
  trimWorkspaceHistory,
  type CommandPreset,
  type WorkspaceHistoryRecord,
} from "../lib/database";
import { applyJsonTransform, type JsonTransformAction } from "../lib/json-tools";
import {
  AUTO_HISTORY_LIMIT,
  MANUAL_HISTORY_LIMIT,
  buildHistoryPreview,
  createHistorySnapshot,
  isSameHistorySnapshot,
  parseWorkspaceHistorySnapshot,
  type WorkspaceHistorySnapshot,
  type WorkspaceHistorySource,
} from "../lib/workspace-history";
import {
  defaultFavoriteToolIds,
  defaultToolId,
  featuredToolIds,
  getTool,
  recentToolIds,
  toolCategories,
  tools,
  workspaceTips,
  type ToolDefinition,
} from "../lib/tools";

function definedTools(toolIds: string[]): ToolDefinition[] {
  return toolIds
    .map((toolId) => getTool(toolId))
    .filter((tool): tool is ToolDefinition => tool !== undefined);
}

function getToolDefaultInputValue(tool: ToolDefinition) {
  return tool.id === "json-formatter" ? "{}" : tool.placeholder;
}

export const useWorkspaceStore = defineStore("workspace", () => {
  const presets = ref<CommandPreset[]>([]);
  const manualHistory = ref<WorkspaceHistoryRecord[]>([]);
  const autoHistory = ref<WorkspaceHistoryRecord[]>([]);
  const lastAutoHistorySnapshot = ref<WorkspaceHistorySnapshot | null>(null);
  const isLoading = ref(true);
  const isInitializing = ref(false);
  const errorMessage = ref("");
  const searchTerm = ref("");
  const activeToolId = ref(defaultToolId);
  const inputValue = ref(getToolDefaultInputValue(getTool(defaultToolId) ?? tools[0]));
  const showLineNumbers = ref(false);
  const liveMode = ref(true);
  const jsonAction = ref<JsonTransformAction>("format");
  const jsonOutputMode = ref<"text" | "tree">("text");
  const jsonTreeDepth = ref(Number.POSITIVE_INFINITY);
  const jsonTreeCollapsedNodeLength = ref(Number.POSITIVE_INFINITY);
  const favoriteToolIds = ref<string[]>([...defaultFavoriteToolIds]);
  const recentToolHistory = ref<string[]>([...recentToolIds]);
  const favoritePresetNames = ref(["API health check", "Open SQLite shell"]);
  const inspectorVisible = ref(false);
  const openInspectorSections = ref<string[]>([
    "manual-history",
    "auto-history",
    "recent",
    "favorites",
    "presets",
    "tips",
  ]);
  const manualOutput = ref(getTool(defaultToolId)?.sampleOutput ?? "");

  const activeTool = computed(() => getTool(activeToolId.value) ?? tools[0]);
  const transformedOutput = computed(() => {
    if (!inputValue.value) {
      return activeTool.value.sampleOutput;
    }

    if (activeTool.value.id === "json-formatter") {
      try {
        return applyJsonTransform(inputValue.value, jsonAction.value);
      } catch (error) {
        return `JSON 解析失败：${error instanceof Error ? error.message : String(error)}`;
      }
    }

    return inputValue.value;
  });
  const outputPreview = computed(() => (liveMode.value ? transformedOutput.value : manualOutput.value));
  const jsonTreeRenderKey = computed(
    () =>
      `${activeToolId.value}:${jsonOutputMode.value}:${jsonTreeDepth.value}:${jsonTreeCollapsedNodeLength.value}:${outputPreview.value}`,
  );
  const jsonTreeData = computed(() => {
    if (activeTool.value.id !== "json-formatter") {
      return null;
    }

    try {
      return JSON.parse(outputPreview.value);
    } catch {
      return null;
    }
  });
  const filteredCategories = computed(() => {
    const keyword = searchTerm.value.trim().toLowerCase();

    return toolCategories
      .map((category) => ({
        ...category,
        tools: category.tools
          .map((tool) => ({
            ...tool,
            categoryId: category.id,
            categoryName: category.name,
          }))
          .filter((tool) => {
            if (!keyword) {
              return true;
            }

            return [tool.name, tool.description, category.name, ...tool.tags].some((value) =>
              value.toLowerCase().includes(keyword),
            );
          }),
      }))
      .filter((category) => category.tools.length > 0);
  });
  const featuredTools = computed(() => definedTools(featuredToolIds));
  const recentTools = computed(() => definedTools(recentToolHistory.value));
  const favoriteTools = computed(() => tools.filter((tool) => favoriteToolIds.value.includes(tool.id)));
  const favoritePresets = computed(() =>
    presets.value.filter((preset) => favoritePresetNames.value.includes(preset.name)),
  );
  const toolStats = computed(() => [
    { label: "工具", value: String(tools.length).padStart(2, "0") },
    { label: "收藏", value: String(favoriteToolIds.value.length).padStart(2, "0") },
    { label: "预设", value: String(presets.value.length).padStart(2, "0") },
  ]);
  const bootstrapStatus = computed(() => {
    if (errorMessage.value) {
      return { tone: "error", label: "SQLite 初始化失败", detail: errorMessage.value };
    }

    if (isLoading.value || isInitializing.value) {
      return { tone: "muted", label: "正在初始化工作区", detail: "准备本地 SQLite 数据和默认预设。" };
    }

    return {
      tone: "ok",
      label: "工作区已就绪",
      detail: `已从 ${DATABASE_URL} 加载 ${presets.value.length} 条默认预设。`,
    };
  });

  function rememberTool(toolId: string) {
    recentToolHistory.value = [toolId, ...recentToolHistory.value.filter((id) => id !== toolId)].slice(0, 6);
  }

  function setSearchTerm(value: string) {
    searchTerm.value = value;
  }

  function applyToolStateDefaults(tool: ToolDefinition) {
    activeToolId.value = tool.id;
    inputValue.value = getToolDefaultInputValue(tool);
    manualOutput.value = tool.sampleOutput;
    liveMode.value = true;
    jsonAction.value = "format";
    jsonOutputMode.value = "text";
    jsonTreeDepth.value = Number.POSITIVE_INFINITY;
    jsonTreeCollapsedNodeLength.value = Number.POSITIVE_INFINITY;
  }

  function setActiveTool(toolId: string) {
    const tool = getTool(toolId) ?? tools[0];
    applyToolStateDefaults(tool);
    rememberTool(tool.id);
  }

  function setInputValue(value: string) {
    inputValue.value = value;
  }

  function setLiveMode(value: boolean) {
    liveMode.value = value;
  }

  function setShowLineNumbers(value: boolean) {
    showLineNumbers.value = value;
  }

  function setJsonAction(action: JsonTransformAction) {
    jsonAction.value = action;
  }

  function setJsonOutputMode(mode: "text" | "tree") {
    jsonOutputMode.value = mode;
  }

  function expandJsonTree() {
    jsonTreeDepth.value = Number.POSITIVE_INFINITY;
    jsonTreeCollapsedNodeLength.value = Number.POSITIVE_INFINITY;
  }

  function collapseJsonTree() {
    jsonTreeDepth.value = 1;
    jsonTreeCollapsedNodeLength.value = 2;
  }

  function toggleFavorite(toolId: string) {
    if (favoriteToolIds.value.includes(toolId)) {
      favoriteToolIds.value = favoriteToolIds.value.filter((id) => id !== toolId);
      return;
    }

    favoriteToolIds.value = [...favoriteToolIds.value, toolId];
  }

  function swapInputAndOutputPreview() {
    inputValue.value = outputPreview.value;
  }

  function runCurrentTransform() {
    manualOutput.value = transformedOutput.value;
  }

  function isInspectorSectionOpen(sectionId: string) {
    return openInspectorSections.value.includes(sectionId);
  }

  function toggleInspectorSection(sectionId: string) {
    if (isInspectorSectionOpen(sectionId)) {
      openInspectorSections.value = openInspectorSections.value.filter((id) => id !== sectionId);
      return;
    }

    openInspectorSections.value = [...openInspectorSections.value, sectionId];
  }

  function toggleInspectorVisibility() {
    inspectorVisible.value = !inspectorVisible.value;
  }

  async function refreshPresets() {
    presets.value = await loadCommandPresets();
  }

  function createCurrentHistorySnapshot(): WorkspaceHistorySnapshot {
    return createHistorySnapshot({
      toolId: activeToolId.value,
      inputValue: inputValue.value,
      outputValue: outputPreview.value,
      options: {
        jsonAction: jsonAction.value,
        liveMode: liveMode.value,
      },
      viewState: {
        jsonOutputMode: jsonOutputMode.value,
        jsonTreeDepth: jsonTreeDepth.value,
        jsonTreeCollapsedNodeLength: jsonTreeCollapsedNodeLength.value,
      },
    });
  }

  async function reloadWorkspaceHistory() {
    const records = await loadWorkspaceHistoryRecords();
    manualHistory.value = records.filter((record) => record.source_type === "manual");
    autoHistory.value = records.filter((record) => record.source_type === "auto");
    if (!autoHistory.value[0]) {
      lastAutoHistorySnapshot.value = null;
      return;
    }

    try {
      lastAutoHistorySnapshot.value = parseWorkspaceHistorySnapshot(autoHistory.value[0].snapshot_json);
    } catch {
      lastAutoHistorySnapshot.value = null;
    }
  }

  function findMatchingAutoHistoryRecord(snapshot: WorkspaceHistorySnapshot) {
    for (const record of autoHistory.value) {
      try {
        if (isSameHistorySnapshot(parseWorkspaceHistorySnapshot(record.snapshot_json), snapshot)) {
          return record;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  async function saveCurrentHistoryEntry(sourceType: WorkspaceHistorySource = "manual") {
    const snapshot = createCurrentHistorySnapshot();

    if (
      sourceType === "auto" &&
      (!snapshot.inputValue.trim() ||
        snapshot.inputValue === getToolDefaultInputValue(getTool(snapshot.toolId) ?? activeTool.value))
    ) {
      return;
    }

    if (sourceType === "auto") {
      const matchingRecord = findMatchingAutoHistoryRecord(snapshot);

      if (matchingRecord) {
        if (autoHistory.value[0]?.id === matchingRecord.id) {
          return;
        }

        await touchWorkspaceHistoryRecord(matchingRecord.id, new Date().toISOString());
        await reloadWorkspaceHistory();
        return;
      }
    }

    if (
      sourceType === "auto" &&
      lastAutoHistorySnapshot.value &&
      isSameHistorySnapshot(lastAutoHistorySnapshot.value, snapshot)
    ) {
      return;
    }

    const createdAt = new Date().toISOString();
    snapshot.savedAt = createdAt;

    await insertWorkspaceHistoryRecord({
      tool_id: snapshot.toolId,
      source_type: sourceType,
      title: buildHistoryPreview(snapshot.inputValue, snapshot.outputValue) || activeTool.value.name,
      input_value: snapshot.inputValue,
      output_value: snapshot.outputValue,
      snapshot_json: JSON.stringify(snapshot),
      created_at: createdAt,
    });
    await trimWorkspaceHistory(sourceType, sourceType === "manual" ? MANUAL_HISTORY_LIMIT : AUTO_HISTORY_LIMIT);
    await reloadWorkspaceHistory();
  }

  async function restoreHistoryEntry(record: WorkspaceHistoryRecord) {
    const snapshot = parseWorkspaceHistorySnapshot(record.snapshot_json);
    const tool = getTool(snapshot.toolId);

    if (!tool) {
      throw new Error(`Cannot restore workspace history for missing tool: ${snapshot.toolId}`);
    }

    applyToolStateDefaults(tool);
    activeToolId.value = snapshot.toolId;
    inputValue.value = snapshot.inputValue;
    manualOutput.value = tool.sampleOutput;
    rememberTool(snapshot.toolId);
  }

  async function deleteHistoryEntry(id: number) {
    await deleteWorkspaceHistoryRecord(id);
    await reloadWorkspaceHistory();
  }

  async function clearHistoryEntries(sourceType: WorkspaceHistorySource) {
    await clearWorkspaceHistory(sourceType, activeToolId.value);
    await reloadWorkspaceHistory();
  }

  function saveAutoHistoryOnInputBlur() {
    void saveCurrentHistoryEntry("auto").catch((error) => {
      errorMessage.value = error instanceof Error ? error.message : String(error);
    });
  }

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

  return {
    activeTool,
    activeToolId,
    autoHistory,
    bootstrapStatus,
    bootstrapWorkspace,
    errorMessage,
    favoriteToolIds,
    favoritePresets,
    favoriteTools,
    featuredTools,
    filteredCategories,
    inputValue,
    inspectorVisible,
    isInitializing,
    isLoading,
    jsonAction,
    jsonOutputMode,
    jsonTreeDepth,
    jsonTreeCollapsedNodeLength,
    jsonTreeRenderKey,
    jsonTreeData,
    lastAutoHistorySnapshot,
    liveMode,
    manualHistory,
    outputPreview,
    presets,
    recentTools,
    deleteHistoryEntry,
    restoreHistoryEntry,
    searchTerm,
    showLineNumbers,
    isInspectorSectionOpen,
    clearHistoryEntries,
    saveCurrentHistoryEntry,
    saveAutoHistoryOnInputBlur,
    setActiveTool,
    setInputValue,
    setJsonAction,
    setJsonOutputMode,
    setLiveMode,
    setShowLineNumbers,
    setSearchTerm,
    expandJsonTree,
    collapseJsonTree,
    runCurrentTransform,
    swapInputAndOutputPreview,
    toggleInspectorSection,
    toggleInspectorVisibility,
    toggleFavorite,
    toolStats,
    workspaceTips,
  };
});
