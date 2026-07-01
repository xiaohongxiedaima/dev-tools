import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyJsonTransform } from '../src/lib/json-tools.ts';
import { findEditorMatch } from '../src/lib/editor-search.ts';

const actionBar = readFileSync(new URL('../src/components/workspace/ToolActionBar.vue', import.meta.url), 'utf8');
const toolSidebar = readFileSync(new URL('../src/components/workspace/ToolSidebar.vue', import.meta.url), 'utf8');
const workspaceView = readFileSync(new URL('../src/views/WorkspaceView.vue', import.meta.url), 'utf8');
const workspaceInspector = readFileSync(new URL('../src/components/workspace/WorkspaceInspector.vue', import.meta.url), 'utf8');
const workspacePanel = readFileSync(new URL('../src/components/workspace/ToolWorkspacePanel.vue', import.meta.url), 'utf8');
const workspaceStore = readFileSync(new URL('../src/stores/workspace.ts', import.meta.url), 'utf8');
const appCss = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const packageJson = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
const codeEditor = readFileSync(new URL('../src/components/workspace/CodeEditor.vue', import.meta.url), 'utf8');

test('formats JSON with indentation', () => {
  assert.equal(applyJsonTransform('{"b":2,"a":1}', 'format'), '{\n  "b": 2,\n  "a": 1\n}');
});

test('minifies JSON without extra whitespace', () => {
  assert.equal(applyJsonTransform('{\n  "b": 2,\n  "a": 1\n}', 'minify'), '{"b":2,"a":1}');
});

test('sorts JSON keys recursively', () => {
  assert.equal(
    applyJsonTransform('{"z":1,"a":{"d":4,"b":2},"m":[{"y":2,"x":1}]}', 'sort'),
    '{\n  "a": {\n    "b": 2,\n    "d": 4\n  },\n  "m": [\n    {\n      "x": 1,\n      "y": 2\n    }\n  ],\n  "z": 1\n}',
  );
});

test('finds next editor match after the current selection', () => {
  assert.deepEqual(findEditorMatch('foo bar foo', 'foo', { from: 0, to: 3 }, 'next'), { from: 8, to: 11 });
});

test('finds previous editor match and wraps when needed', () => {
  assert.deepEqual(findEditorMatch('foo bar foo', 'foo', { from: 0, to: 3 }, 'previous'), { from: 8, to: 11 });
});

test('json input actions stay focused on text transforms only', () => {
  assert.match(workspacePanel, /class="workspace-header compact shell-card"/);
  assert.match(workspacePanel, /格式化 JSON/);
  assert.match(workspacePanel, /压缩 JSON/);
  assert.match(workspacePanel, /排序 JSON/);
  assert.match(workspacePanel, /class="panel-header compact"/);
  assert.match(workspacePanel, /class="json-input-header-row"/);
  assert.doesNotMatch(workspacePanel, /activeTool\.description/);
  assert.doesNotMatch(workspacePanel, /保留原始内容，适合粘贴请求体、时间值、URL 或待转换文本。/);
  assert.doesNotMatch(workspacePanel, /jsonAction === 'tree'/);
});

test('json tool uses brace default placeholder', () => {
  const toolsSource = readFileSync(new URL('../src/lib/tools.ts', import.meta.url), 'utf8');
  assert.match(toolsSource, /id: "json-formatter"[\s\S]*placeholder: "\{\}"/);
});

test('json output area supports tree mode via collapsible component', () => {
  assert.match(workspacePanel, /VueJsonPretty/);
  assert.match(workspacePanel, /树状视图/);
  assert.match(workspacePanel, /jsonOutputMode/);
  assert.match(workspacePanel, /collapsed-node-length/);
});

test('json workspace removes redundant live-preview and output title copy', () => {
  assert.equal((`${actionBar}\n${workspacePanel}`.match(/实时预览/g) ?? []).length, 1);
  assert.doesNotMatch(workspacePanel, /JSON 输出结果/);
  assert.match(workspacePanel, /aria-pressed="workspaceStore\.liveMode"/);
  assert.doesNotMatch(workspacePanel, /type="checkbox"/);
});

test('toolbar removes example action and top favorite control', () => {
  assert.doesNotMatch(actionBar, />\s*示例\s*</);
  assert.doesNotMatch(actionBar, /toolbar-icon-button/);
  assert.doesNotMatch(actionBar, /★|☆/);
  assert.doesNotMatch(actionBar, /切换星标|收藏工具|取消收藏/);
});

test('toolbar uses text buttons for clear and swap actions', () => {
  assert.match(actionBar, />\s*保存历史\s*</);
  assert.match(actionBar, /显示行号/);
  assert.match(actionBar, /aria-pressed="workspaceStore\.showLineNumbers"/);
  assert.doesNotMatch(actionBar, /type="checkbox"/);
  assert.match(actionBar, />\s*清空\s*</);
  assert.match(actionBar, />\s*交换输入输出\s*</);
});

test('workspace toolbar keeps actions in a single row', () => {
  assert.match(appCss, /\.workspace-toolbar\s*\{[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(appCss, /\.workspace-header\s*\{[\s\S]*align-items:\s*center/);
});

test('workspace inspector replaces status panel with grouped history sections', () => {
  assert.doesNotMatch(workspaceInspector, /状态面板/);
  assert.match(workspaceInspector, /手动保存/);
  assert.match(workspaceInspector, /自动输入历史/);
  assert.match(workspaceInspector, /restoreHistoryEntry/);
  assert.match(workspaceInspector, /clearHistoryEntries/);
  assert.match(workspaceInspector, /deleteHistoryEntry/);
  assert.match(workspaceInspector, />\s*一键清空\s*</);
  assert.equal((workspaceInspector.match(/>\s*删除\s*</g) ?? []).length, 2);
  assert.doesNotMatch(workspaceInspector, /history-card-actions/);
  assert.doesNotMatch(workspaceInspector, /getHistoryToolName/);
});

test('workspace copy and chrome use history panel wording', () => {
  const toolsSource = readFileSync(new URL('../src/lib/tools.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(toolsSource, /状态面板/);
  assert.match(appCss, /历史中心|历史记录/);
  assert.doesNotMatch(appCss, /隐藏右侧状态面板|显示右侧状态面板/);
});

test('app styles include history center hooks', () => {
  assert.match(appCss, /history-list/);
  assert.match(appCss, /history-card/);
  assert.match(appCss, /history-header-row/);
  assert.match(appCss, /history-meta-row/);
});

test('tool navigation shows tool name and description on separate lines', () => {
  assert.match(toolSidebar, /class="tool-nav-copy"/);
  assert.match(toolSidebar, /class="tool-nav-top-row"/);
  assert.match(toolSidebar, /class="tool-nav-title-row"/);
  assert.match(toolSidebar, /<small>{{ tool\.description }}<\/small>/);
  assert.match(appCss, /\.tool-nav-copy\s*\{[\s\S]*display:\s*grid/);
  assert.match(appCss, /\.tool-nav-top-row\s*\{[\s\S]*justify-content:\s*space-between/);
  assert.match(appCss, /\.tool-nav-title-row\s*\{[\s\S]*display:\s*inline-flex/);
});

test('workspace layout supports dragging sidebar and history panel widths', () => {
  assert.match(workspaceView, /startResize\('sidebar'/);
  assert.match(workspaceView, /startResize\('inspector'/);
  assert.match(appCss, /--workspace-sidebar-width/);
  assert.match(appCss, /--workspace-inspector-width/);
  assert.match(appCss, /workspace-resize-handle/);
});

test('history panel only shows current tool records and limits manual\/auto counts', () => {
  assert.match(workspaceInspector, /entry\.tool_id === workspaceStore\.activeToolId/);
  assert.match(workspaceInspector, /slice\(0,\s*5\)/);
  assert.match(workspaceInspector, /slice\(0,\s*10\)/);
  assert.doesNotMatch(workspaceInspector, /{{ getHistoryToolName\(entry\.tool_id\) }}/);
});

test('json output actions use text buttons and tree controls', () => {
  assert.match(workspacePanel, /copyOutput/);
  assert.match(workspacePanel, />\s*文本视图\s*</);
  assert.match(workspacePanel, />\s*树状视图\s*</);
  assert.match(workspacePanel, />\s*一键展开\s*</);
  assert.match(workspacePanel, />\s*一键折叠\s*</);
  assert.doesNotMatch(workspacePanel, /展示格式化结果、转换结果或工具处理后的预览内容。/);
  assert.match(workspacePanel, /class="json-output-action-row"/);
});

test('input and output areas expose direct search controls', () => {
  assert.match(workspacePanel, /input-search-query/);
  assert.match(workspacePanel, /output-search-query/);
  assert.match(workspacePanel, />\s*查找\s*</);
  assert.match(workspacePanel, />\s*上一个\s*</);
  assert.match(workspacePanel, />\s*下一个\s*</);
});

test('copy result action exposes visible success or failure feedback', () => {
  assert.match(workspacePanel, /const copyFeedback = ref<"idle" \| "success" \| "error">\("idle"\);/);
  assert.match(workspacePanel, /const copyButtonLabel = computed\(\(\) =>/);
  assert.match(workspacePanel, /{{ copyButtonLabel }}/);
  assert.match(workspacePanel, /copyFeedback\.value = "success"/);
  assert.match(workspacePanel, /copyFeedback\.value = "error"/);
});

test('json tree view uses dedicated styling hooks', () => {
  assert.match(appCss, /json-tree-view/);
  assert.match(appCss, /workspace-toolbar/);
});

test('workspace inspector is hidden by default', () => {
  assert.match(workspaceStore, /const inspectorVisible = ref\(false\);/);
});

test('workspace store tracks tree expansion controls', () => {
  assert.match(workspaceStore, /const jsonTreeDepth = ref\(Number\.POSITIVE_INFINITY\);/);
  assert.match(workspaceStore, /const jsonTreeCollapsedNodeLength = ref\(Number\.POSITIVE_INFINITY\);/);
  assert.match(workspaceStore, /function expandJsonTree\(\)/);
  assert.match(workspaceStore, /function collapseJsonTree\(\)/);
});

test('json tree re-renders when expand collapse state changes', () => {
  assert.match(workspacePanel, /:key="workspaceStore\.jsonTreeRenderKey"/);
  assert.match(workspaceStore, /const jsonTreeRenderKey = computed\(/);
  assert.match(workspacePanel, /:collapsed-node-length="workspaceStore\.jsonTreeCollapsedNodeLength"/);
});

test('json tool uses codemirror for editable input and readonly text output', () => {
  assert.match(workspacePanel, /import CodeEditor from "\.\/CodeEditor\.vue"/);
  assert.match(workspacePanel, /<CodeEditor[\s\S]*:model-value="workspaceStore\.inputValue"/);
  assert.match(workspacePanel, /<CodeEditor[\s\S]*:model-value="workspaceStore\.outputPreview"/);
  assert.match(workspacePanel, /:language="isJsonTool \? 'json' : 'text'"/);
  assert.match(workspacePanel, /:readonly="true"/);
  assert.match(workspacePanel, /:show-line-numbers="workspaceStore\.showLineNumbers"/);
  assert.match(workspacePanel, /@update:model-value="workspaceStore\.setInputValue"/);
  assert.match(workspacePanel, /@blur="workspaceStore\.saveAutoHistoryOnInputBlur"/);
});

test('readonly output editor does not write transformed text back into input', () => {
  assert.match(workspacePanel, /<CodeEditor[\s\S]*:model-value="workspaceStore\.outputPreview"/);
  assert.doesNotMatch(
    workspacePanel,
    /<CodeEditor[\s\S]*:model-value="workspaceStore\.outputPreview"[\s\S]*@update:model-value="workspaceStore\.setInputValue"/,
  );
});

test('package installs codemirror and github-style theme support', () => {
  assert.match(packageJson, /vue-codemirror6/);
  assert.match(packageJson, /@codemirror\/lang-json/);
  assert.match(packageJson, /github/i);
});

test('app styles include codemirror panel hooks', () => {
  assert.match(appCss, /code-editor-shell/);
  assert.match(appCss, /\.cm-editor/);
});

test('code editor exposes search locate methods', () => {
  assert.match(codeEditor, /defineExpose\(/);
  assert.match(codeEditor, /findNextMatch/);
  assert.match(codeEditor, /findPreviousMatch/);
  assert.match(codeEditor, /emit\("blur"\)/);
  assert.match(codeEditor, /@focusout="handleFocusOut"/);
  assert.match(codeEditor, /@ready=/);
});

test('code editor supports hiding line numbers by default', () => {
  assert.match(codeEditor, /showLineNumbers\?: boolean/);
  assert.match(codeEditor, /code-editor-shell--hide-line-numbers/);
});
