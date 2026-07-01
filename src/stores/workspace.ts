import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { applyBase64Transform, type Base64TransformMode } from "../lib/base64-tools";
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
import { applyJsonTransform, type JsonTransformMode } from "../lib/json-tools";
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
  createDefaultRedisLuaHistoryState,
  formatRedisLuaDebugResponse,
  parseRedisLuaArrayInput,
  type RedisLuaDebugResponse,
  type RedisLuaExecutionMode,
} from "../lib/redis-lua-debug";
import { invokeRedisLuaDebug } from "../lib/redis-lua-debug-api";
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
  if (tool.id === "json-formatter") {
    return "{}";
  }

  return tool.placeholder;
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
  const inputShowLineNumbers = ref(false);
  const outputShowLineNumbers = ref(false);
  const inputSoftWrap = ref(true);
  const outputSoftWrap = ref(false);
  const liveMode = ref(true);
  const jsonMode = ref<JsonTransformMode>("format");
  const jsonSortKeys = ref(false);
  const base64Mode = ref<Base64TransformMode>("decode");
  const jsonOutputMode = ref<"text" | "tree">("text");
  const jsonTreeDepth = ref(Number.POSITIVE_INFINITY);
  const jsonTreeCollapsedNodeLength = ref(Number.POSITIVE_INFINITY);
  const redisLuaDefaults = createDefaultRedisLuaHistoryState();
  const redisLuaRedisUrl = ref(redisLuaDefaults.redisUrl);
  const redisLuaKeysText = ref(redisLuaDefaults.keysText);
  const redisLuaArgvText = ref(redisLuaDefaults.argvText);
  const redisLuaExecutionMode = ref<RedisLuaExecutionMode>(redisLuaDefaults.executionMode);
  const redisLuaIsRunning = ref(false);
  const redisLuaLastResponse = ref<RedisLuaDebugResponse | null>(null);
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
        return applyJsonTransform(inputValue.value, {
          mode: jsonMode.value,
          sortKeys: jsonSortKeys.value,
        });
      } catch (error) {
        return `JSON 解析失败：${error instanceof Error ? error.message : String(error)}`;
      }
    }

    if (activeTool.value.id === "base64") {
      try {
        return applyBase64Transform(inputValue.value, base64Mode.value);
      } catch (error) {
        return `Base64 转换失败：${error instanceof Error ? error.message : String(error)}`;
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
      return { tone: "error", label: "工作区出现异常", detail: errorMessage.value };
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

  function applyRedisLuaDefaults() {
    const defaults = createDefaultRedisLuaHistoryState();
    redisLuaRedisUrl.value = defaults.redisUrl;
    redisLuaKeysText.value = defaults.keysText;
    redisLuaArgvText.value = defaults.argvText;
    redisLuaExecutionMode.value = defaults.executionMode;
    redisLuaIsRunning.value = false;
    redisLuaLastResponse.value = null;
  }

  function applyPanelViewDefaults() {
    inputShowLineNumbers.value = false;
    outputShowLineNumbers.value = false;
    inputSoftWrap.value = true;
    outputSoftWrap.value = false;
  }

  function setSearchTerm(value: string) {
    searchTerm.value = value;
  }

  function applyToolStateDefaults(tool: ToolDefinition) {
    activeToolId.value = tool.id;
    inputValue.value = getToolDefaultInputValue(tool);
    manualOutput.value = tool.sampleOutput;
    applyPanelViewDefaults();
    liveMode.value = tool.id !== "redis-lua-debug-console";
    jsonMode.value = "format";
    jsonSortKeys.value = false;
    base64Mode.value = "decode";
    jsonOutputMode.value = "text";
    jsonTreeDepth.value = Number.POSITIVE_INFINITY;
    jsonTreeCollapsedNodeLength.value = Number.POSITIVE_INFINITY;
    errorMessage.value = "";

    if (tool.id === "redis-lua-debug-console") {
      applyRedisLuaDefaults();
    }
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

  function setInputShowLineNumbers(value: boolean) {
    inputShowLineNumbers.value = value;
  }

  function setOutputShowLineNumbers(value: boolean) {
    outputShowLineNumbers.value = value;
  }

  function setInputSoftWrap(value: boolean) {
    inputSoftWrap.value = value;
  }

  function setOutputSoftWrap(value: boolean) {
    outputSoftWrap.value = value;
  }

  function setJsonMode(mode: JsonTransformMode) {
    jsonMode.value = mode;
  }

  function setBase64Mode(mode: Base64TransformMode) {
    base64Mode.value = mode;
  }

  function toggleJsonSortKeys() {
    jsonSortKeys.value = !jsonSortKeys.value;
  }

  function setJsonOutputMode(mode: "text" | "tree") {
    jsonOutputMode.value = mode;
  }

  function setRedisLuaRedisUrl(value: string) {
    redisLuaRedisUrl.value = value;
  }

  function setRedisLuaKeysText(value: string) {
    redisLuaKeysText.value = value;
  }

  function setRedisLuaArgvText(value: string) {
    redisLuaArgvText.value = value;
  }

  function setRedisLuaExecutionMode(mode: RedisLuaExecutionMode) {
    redisLuaExecutionMode.value = mode;
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

  async function runCurrentTransform() {
    if (activeTool.value.id === "redis-lua-debug-console") {
      const redisUrl = redisLuaRedisUrl.value.trim();
      if (!redisUrl) {
        const message = "Redis 地址不能为空。";
        manualOutput.value = message;
        redisLuaLastResponse.value = null;
        return;
      }

      let keys: string[];
      let argv: string[];
      try {
        keys = parseRedisLuaArrayInput(redisLuaKeysText.value, "KEYS");
        argv = parseRedisLuaArrayInput(redisLuaArgvText.value, "ARGV");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        manualOutput.value = message;
        redisLuaLastResponse.value = null;
        return;
      }

      redisLuaIsRunning.value = true;
      errorMessage.value = "";

      try {
        const response = await invokeRedisLuaDebug({
          redisUrl,
          script: inputValue.value,
          keys,
          argv,
          executionMode: redisLuaExecutionMode.value,
        });

        redisLuaLastResponse.value = response;
        manualOutput.value = formatRedisLuaDebugResponse(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errorMessage.value = message;
        redisLuaLastResponse.value = null;
        manualOutput.value = JSON.stringify(
          {
            success: false,
            mode: redisLuaExecutionMode.value,
            error: message,
            result: "",
            traceCount: 0,
            logCount: 0,
          },
          null,
          2,
        );
      } finally {
        redisLuaIsRunning.value = false;
      }

      return;
    }

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
        jsonMode: jsonMode.value,
        jsonSortKeys: jsonSortKeys.value,
        base64Mode: base64Mode.value,
        liveMode: liveMode.value,
      },
      viewState: {
        inputShowLineNumbers: inputShowLineNumbers.value,
        outputShowLineNumbers: outputShowLineNumbers.value,
        inputSoftWrap: inputSoftWrap.value,
        outputSoftWrap: outputSoftWrap.value,
        jsonOutputMode: jsonOutputMode.value,
        jsonTreeDepth: jsonTreeDepth.value,
        jsonTreeCollapsedNodeLength: jsonTreeCollapsedNodeLength.value,
      },
      toolState:
        activeToolId.value === "redis-lua-debug-console"
          ? {
              redisLua: {
                redisUrl: redisLuaRedisUrl.value,
                keysText: redisLuaKeysText.value,
                argvText: redisLuaArgvText.value,
                executionMode: redisLuaExecutionMode.value,
              },
            }
          : {},
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
    manualOutput.value =
      snapshot.toolId === "redis-lua-debug-console"
        ? snapshot.outputValue
        : snapshot.toolId === "json-formatter"
          ? snapshot.outputValue
          : snapshot.toolId === "base64"
            ? snapshot.outputValue
          : tool.sampleOutput;
    liveMode.value = snapshot.options.liveMode ?? tool.id !== "redis-lua-debug-console";
    inputShowLineNumbers.value = snapshot.viewState.inputShowLineNumbers ?? false;
    outputShowLineNumbers.value = snapshot.viewState.outputShowLineNumbers ?? false;
    inputSoftWrap.value = snapshot.viewState.inputSoftWrap ?? true;
    outputSoftWrap.value = snapshot.viewState.outputSoftWrap ?? false;

    if (snapshot.toolId === "json-formatter") {
      jsonMode.value = snapshot.options.jsonMode ?? (snapshot.options.jsonAction === "minify" ? "minify" : "format");
      jsonSortKeys.value = snapshot.options.jsonSortKeys ?? snapshot.options.jsonAction === "sort";
    }

    if (snapshot.toolId === "base64") {
      base64Mode.value = snapshot.options.base64Mode ?? "decode";
    }

    if (snapshot.toolId === "redis-lua-debug-console" && snapshot.toolState.redisLua) {
      redisLuaRedisUrl.value = snapshot.toolState.redisLua.redisUrl;
      redisLuaKeysText.value = snapshot.toolState.redisLua.keysText;
      redisLuaArgvText.value = snapshot.toolState.redisLua.argvText;
      redisLuaExecutionMode.value = snapshot.toolState.redisLua.executionMode;
    }

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
    base64Mode,
    errorMessage,
    favoriteToolIds,
    favoritePresets,
    favoriteTools,
    featuredTools,
    filteredCategories,
    inputValue,
    inputShowLineNumbers,
    inputSoftWrap,
    inspectorVisible,
    isInitializing,
    isLoading,
    jsonMode,
    jsonSortKeys,
    jsonOutputMode,
    jsonTreeDepth,
    jsonTreeCollapsedNodeLength,
    jsonTreeRenderKey,
    jsonTreeData,
    lastAutoHistorySnapshot,
    liveMode,
    manualHistory,
    outputPreview,
    outputShowLineNumbers,
    outputSoftWrap,
    presets,
    recentTools,
    redisLuaArgvText,
    redisLuaExecutionMode,
    redisLuaIsRunning,
    redisLuaKeysText,
    redisLuaLastResponse,
    redisLuaRedisUrl,
    deleteHistoryEntry,
    restoreHistoryEntry,
    searchTerm,
    isInspectorSectionOpen,
    clearHistoryEntries,
    saveCurrentHistoryEntry,
    saveAutoHistoryOnInputBlur,
    setActiveTool,
    setBase64Mode,
    setInputShowLineNumbers,
    setInputSoftWrap,
    setInputValue,
    setJsonMode,
    setJsonOutputMode,
    setLiveMode,
    setOutputShowLineNumbers,
    setOutputSoftWrap,
    setRedisLuaArgvText,
    setRedisLuaExecutionMode,
    setRedisLuaKeysText,
    setRedisLuaRedisUrl,
    setSearchTerm,
    toggleJsonSortKeys,
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
