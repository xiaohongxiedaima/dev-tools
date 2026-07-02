export const AUTO_HISTORY_LIMIT = 50;
export const MANUAL_HISTORY_LIMIT = 200;

export type WorkspaceHistorySource = "manual" | "auto";

export type WorkspaceHistoryOptions = {
  jsonAction?: "format" | "minify" | "sort";
  jsonMode?: "format" | "minify";
  jsonSortKeys?: boolean;
  base64Mode?: "decode" | "encode";
  liveMode?: boolean;
};

export type WorkspaceHistoryViewState = {
  inputShowLineNumbers?: boolean;
  outputShowLineNumbers?: boolean;
  inputSoftWrap?: boolean;
  outputSoftWrap?: boolean;
  jsonOutputMode?: "text" | "tree";
  jsonTreeDepth?: number;
  jsonTreeCollapsedNodeLength?: number;
};

export type WorkspaceHistoryToolState = {
  redisLua?: {
    redisUrl: string;
    keysText: string;
    argvText: string;
    executionMode: 'proxy' | 'eval';
  };
};

export type WorkspaceHistorySnapshot = {
  toolId: string;
  inputValue: string;
  outputValue: string;
  savedAt: string;
  options: WorkspaceHistoryOptions;
  viewState: WorkspaceHistoryViewState;
  toolState: WorkspaceHistoryToolState;
};

export type CreateHistorySnapshotInput = {
  toolId: string;
  inputValue: string;
  outputValue: string;
  options?: WorkspaceHistoryOptions;
  viewState?: WorkspaceHistoryViewState;
  toolState?: WorkspaceHistoryToolState;
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sameOptions(left: WorkspaceHistoryOptions, right: WorkspaceHistoryOptions): boolean {
  const leftJsonMode = left.jsonMode ?? (left.jsonAction === "minify" ? "minify" : "format");
  const rightJsonMode = right.jsonMode ?? (right.jsonAction === "minify" ? "minify" : "format");
  const leftJsonSortKeys = left.jsonSortKeys ?? left.jsonAction === "sort";
  const rightJsonSortKeys = right.jsonSortKeys ?? right.jsonAction === "sort";

  return (
    leftJsonMode === rightJsonMode &&
    leftJsonSortKeys === rightJsonSortKeys &&
    left.base64Mode === right.base64Mode &&
    left.liveMode === right.liveMode
  );
}

function sameViewState(left: WorkspaceHistoryViewState, right: WorkspaceHistoryViewState): boolean {
  return (
    left.inputShowLineNumbers === right.inputShowLineNumbers &&
    left.outputShowLineNumbers === right.outputShowLineNumbers &&
    left.inputSoftWrap === right.inputSoftWrap &&
    left.outputSoftWrap === right.outputSoftWrap &&
    left.jsonOutputMode === right.jsonOutputMode &&
    left.jsonTreeDepth === right.jsonTreeDepth &&
    left.jsonTreeCollapsedNodeLength === right.jsonTreeCollapsedNodeLength
  );
}

function sameToolState(left: WorkspaceHistoryToolState, right: WorkspaceHistoryToolState): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function buildHistoryPreview(inputValue: string, outputValue: string): string {
  const sourceText = collapseWhitespace(inputValue.trim() ? inputValue : outputValue);

  return sourceText.slice(0, 80);
}

export function createHistorySnapshot({
  toolId,
  inputValue,
  outputValue,
  options = {},
  viewState = {},
  toolState = {},
}: CreateHistorySnapshotInput): WorkspaceHistorySnapshot {
  return {
    toolId,
    inputValue,
    outputValue,
    savedAt: "",
    options: { ...options },
    viewState: { ...viewState },
    toolState: { ...toolState },
  };
}

export function isSameHistorySnapshot(
  left: WorkspaceHistorySnapshot,
  right: WorkspaceHistorySnapshot,
): boolean {
  return (
    left.toolId === right.toolId &&
    left.inputValue === right.inputValue &&
    left.outputValue === right.outputValue &&
    sameOptions(left.options, right.options) &&
    sameViewState(left.viewState, right.viewState) &&
    sameToolState(left.toolState, right.toolState)
  );
}

export function parseWorkspaceHistorySnapshot(snapshotJson: string): WorkspaceHistorySnapshot {
  const value = JSON.parse(snapshotJson);

  if (
    !value ||
    typeof value !== "object" ||
    typeof value.toolId !== "string" ||
    typeof value.inputValue !== "string" ||
    typeof value.outputValue !== "string" ||
    typeof value.savedAt !== "string"
  ) {
    throw new Error("Invalid workspace history snapshot.");
  }

  return {
    toolId: value.toolId,
    inputValue: value.inputValue,
    outputValue: value.outputValue,
    savedAt: value.savedAt,
    options: value.options && typeof value.options === "object" ? { ...value.options } : {},
    viewState: value.viewState && typeof value.viewState === "object" ? { ...value.viewState } : {},
    toolState: value.toolState && typeof value.toolState === "object" ? { ...value.toolState } : {},
  };
}
