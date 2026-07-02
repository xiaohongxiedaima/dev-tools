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
import { applyJsonTransform } from "../lib/json-tools";
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
import { parseRedisLuaArrayInput } from "../lib/redis-lua-debug";
import { invokeRedisLuaDebug } from "../lib/redis-lua-debug-api";
import { useRedisLuaStore } from "./redisLua";
import { useJsonToolStore } from "./jsonTool";
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
  const inputFontSize = ref(14);
  const outputFontSize = ref(14);
  const liveMode = ref(true);
  const base64Mode = ref<Base64TransformMode>("decode");
  const favoriteToolIds = ref<string[]>([...defaultFavoriteToolIds]);
  const recentToolHistory = ref<string[]>([...recentToolIds]);
  const favoritePresetNames = ref(["API health check", "Open SQLite shell"]);
  const workspaceLayout = ref<"left-center" | "all" | "center-right" | "center">("center");
  const sidebarVisible = computed(() => workspaceLayout.value === "left-center" || workspaceLayout.value === "all");
  const inspectorVisible = computed(() => workspaceLayout.value === "all" || workspaceLayout.value === "center-right");
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
      const jsonStore = useJsonToolStore();
      try {
        return applyJsonTransform(inputValue.value, {
          mode: jsonStore.jsonMode,
          sortKeys: jsonStore.jsonSortKeys,
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
    useRedisLuaStore().applyRedisLuaDefaults();
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
    const jsonStore = useJsonToolStore();
    activeToolId.value = tool.id;
    inputValue.value = getToolDefaultInputValue(tool);
    manualOutput.value = tool.sampleOutput;
    applyPanelViewDefaults();
    liveMode.value = tool.id !== "redis-lua-debug-console";
    jsonStore.jsonMode = "format";
    jsonStore.jsonSortKeys = false;
    base64Mode.value = "decode";
    jsonStore.jsonOutputMode = "text";
    jsonStore.jsonTreeDepth = Number.POSITIVE_INFINITY;
    jsonStore.jsonTreeCollapsedNodeLength = Number.POSITIVE_INFINITY;
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

  function zoomEditorFont(side: "input" | "output", delta: number) {
    const ref = side === "input" ? inputFontSize : outputFontSize;
    const next = ref.value + delta;
    ref.value = Math.min(Math.max(next, 10), 28);
  }

  function setBase64Mode(mode: Base64TransformMode) {
    base64Mode.value = mode;
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
      const redisLuaStore = useRedisLuaStore();
      const redisUrl = redisLuaStore.redisLuaRedisUrl.trim();
      if (!redisUrl) {
        const message = "Redis 地址不能为空。";
        manualOutput.value = message;
        redisLuaStore.redisLuaLastResponse = {
          success: false,
          mode: redisLuaStore.redisLuaExecutionMode,
          resultPreview: "",
          error: message,
          trace: [],
          logs: [],
        };
        return;
      }

      let keys: string[];
      let argv: string[];
      try {
        keys = parseRedisLuaArrayInput(redisLuaStore.redisLuaKeysText, "KEYS");
        argv = parseRedisLuaArrayInput(redisLuaStore.redisLuaArgvText, "ARGV");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        manualOutput.value = message;
        redisLuaStore.redisLuaLastResponse = {
          success: false,
          mode: redisLuaStore.redisLuaExecutionMode,
          resultPreview: "",
          error: message,
          trace: [],
          logs: [],
        };
        return;
      }

      redisLuaStore.redisLuaIsRunning = true;
      errorMessage.value = "";

      try {
        const response = await invokeRedisLuaDebug({
          redisUrl,
          script: inputValue.value,
          keys,
          argv,
          executionMode: redisLuaStore.redisLuaExecutionMode,
        });

        redisLuaStore.redisLuaLastResponse = response;
        manualOutput.value = response.success
          ? response.resultPreview
          : response.error ?? "执行失败";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errorMessage.value = message;
        redisLuaStore.redisLuaLastResponse = {
          success: false,
          mode: redisLuaStore.redisLuaExecutionMode,
          resultPreview: "",
          error: message,
          trace: [],
          logs: [],
        };
        manualOutput.value = message;
      } finally {
        redisLuaStore.redisLuaIsRunning = false;
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
    workspaceLayout.value = inspectorVisible.value ? "left-center" : "all";
  }

  function toggleSidebarVisibility() {
    workspaceLayout.value = sidebarVisible.value ? "center-right" : "all";
  }

  function setWorkspaceLayout(layout: "left-center" | "all" | "center-right" | "center") {
    workspaceLayout.value = layout;
  }

  async function refreshPresets() {
    presets.value = await loadCommandPresets();
  }

  function createCurrentHistorySnapshot(): WorkspaceHistorySnapshot {
    const jsonStore = useJsonToolStore();
    const redisLuaStore = useRedisLuaStore();
    return createHistorySnapshot({
      toolId: activeToolId.value,
      inputValue: inputValue.value,
      outputValue: outputPreview.value,
      options: {
        jsonMode: jsonStore.jsonMode,
        jsonSortKeys: jsonStore.jsonSortKeys,
        base64Mode: base64Mode.value,
        liveMode: liveMode.value,
      },
      viewState: {
        inputShowLineNumbers: inputShowLineNumbers.value,
        outputShowLineNumbers: outputShowLineNumbers.value,
        inputSoftWrap: inputSoftWrap.value,
        outputSoftWrap: outputSoftWrap.value,
        jsonOutputMode: jsonStore.jsonOutputMode,
        jsonTreeDepth: jsonStore.jsonTreeDepth,
        jsonTreeCollapsedNodeLength: jsonStore.jsonTreeCollapsedNodeLength,
      },
      toolState:
        activeToolId.value === "redis-lua-debug-console"
          ? {
              redisLua: {
                redisUrl: redisLuaStore.redisLuaRedisUrl,
                keysText: redisLuaStore.redisLuaKeysText,
                argvText: redisLuaStore.redisLuaArgvText,
                executionMode: redisLuaStore.redisLuaExecutionMode,
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
    const jsonStore = useJsonToolStore();
    const redisLuaStore = useRedisLuaStore();
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
      jsonStore.jsonMode = snapshot.options.jsonMode ?? (snapshot.options.jsonAction === "minify" ? "minify" : "format");
      jsonStore.jsonSortKeys = snapshot.options.jsonSortKeys ?? snapshot.options.jsonAction === "sort";
    }

    if (snapshot.toolId === "base64") {
      base64Mode.value = snapshot.options.base64Mode ?? "decode";
    }

    if (snapshot.toolId === "redis-lua-debug-console" && snapshot.toolState.redisLua) {
      redisLuaStore.redisLuaRedisUrl = snapshot.toolState.redisLua.redisUrl;
      redisLuaStore.redisLuaKeysText = snapshot.toolState.redisLua.keysText;
      redisLuaStore.redisLuaArgvText = snapshot.toolState.redisLua.argvText;
      redisLuaStore.redisLuaExecutionMode = snapshot.toolState.redisLua.executionMode;
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
    sidebarVisible,
    isInitializing,
    isLoading,
    editorFontSize: inputFontSize,
    inputFontSize,
    jsonTreeData,
    lastAutoHistorySnapshot,
    liveMode,
    manualHistory,
    outputFontSize,
    outputPreview,
    outputShowLineNumbers,
    outputSoftWrap,
    presets,
    recentTools,
    searchTerm,
    deleteHistoryEntry,
    restoreHistoryEntry,
    isInspectorSectionOpen,
    clearHistoryEntries,
    saveCurrentHistoryEntry,
    saveAutoHistoryOnInputBlur,
    setActiveTool,
    setBase64Mode,
    setInputShowLineNumbers,
    setInputSoftWrap,
    setInputValue,
    setLiveMode,
    setOutputShowLineNumbers,
    setOutputSoftWrap,
    setSearchTerm,
    setWorkspaceLayout,
    runCurrentTransform,
    swapInputAndOutputPreview,
    toggleInspectorSection,
    toggleInspectorVisibility,
    toggleSidebarVisibility,
    toggleFavorite,
    tools,
    workspaceLayout,
    zoomEditorFont,
    toolStats,
    workspaceTips,
  };
});
