export const AUTO_HISTORY_LIMIT = 50;
export const MANUAL_HISTORY_LIMIT = 200;

export type WorkspaceHistorySource = "manual" | "auto";

export type WorkspaceHistoryOptions = {
  jsonAction?: "format" | "minify" | "sort";
  liveMode?: boolean;
};

export type WorkspaceHistoryViewState = {
  jsonOutputMode?: "text" | "tree";
  jsonTreeDepth?: number;
  jsonTreeCollapsedNodeLength?: number;
};

export type WorkspaceHistorySnapshot = {
  toolId: string;
  inputValue: string;
  outputValue: string;
  savedAt: string;
  options: WorkspaceHistoryOptions;
  viewState: WorkspaceHistoryViewState;
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sameOptions(left: WorkspaceHistoryOptions, right: WorkspaceHistoryOptions): boolean {
  return (
    left.jsonAction === right.jsonAction &&
    left.liveMode === right.liveMode
  );
}

function sameViewState(left: WorkspaceHistoryViewState, right: WorkspaceHistoryViewState): boolean {
  return (
    left.jsonOutputMode === right.jsonOutputMode &&
    left.jsonTreeDepth === right.jsonTreeDepth &&
    left.jsonTreeCollapsedNodeLength === right.jsonTreeCollapsedNodeLength
  );
}

export function buildHistoryPreview(inputValue: string, outputValue: string): string {
  const sourceText = collapseWhitespace(inputValue.trim() ? inputValue : outputValue);

  return sourceText.slice(0, 80);
}

export function createHistorySnapshot(
  toolId: string,
  inputValue: string,
  outputValue: string,
  options: WorkspaceHistoryOptions = {},
  viewState: WorkspaceHistoryViewState = {},
): WorkspaceHistorySnapshot {
  return {
    toolId,
    inputValue,
    outputValue,
    savedAt: "",
    options: { ...options },
    viewState: { ...viewState },
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
    sameViewState(left.viewState, right.viewState)
  );
}
