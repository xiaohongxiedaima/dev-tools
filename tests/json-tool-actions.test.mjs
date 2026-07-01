import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyBase64Transform } from '../src/lib/base64-tools.ts';
import { applyJsonTransform } from '../src/lib/json-tools.ts';
import { findEditorMatch } from '../src/lib/editor-search.ts';

const actionBar = readFileSync(new URL('../src/components/workspace/ToolActionBar.vue', import.meta.url), 'utf8');
const toolSidebar = readFileSync(new URL('../src/components/workspace/ToolSidebar.vue', import.meta.url), 'utf8');
const workspaceView = readFileSync(new URL('../src/views/WorkspaceView.vue', import.meta.url), 'utf8');
const workspaceInspector = readFileSync(new URL('../src/components/workspace/WorkspaceInspector.vue', import.meta.url), 'utf8');
const toolWorkspacePanel = readFileSync(new URL('../src/components/workspace/ToolWorkspacePanel.vue', import.meta.url), 'utf8');
const jsonWorkspacePanel = readFileSync(new URL('../src/components/workspace/JsonToolWorkspacePanel.vue', import.meta.url), 'utf8');
const defaultWorkspacePanel = readFileSync(new URL('../src/components/workspace/DefaultToolWorkspacePanel.vue', import.meta.url), 'utf8');
const redisWorkspacePanel = readFileSync(new URL('../src/components/workspace/RedisLuaToolWorkspacePanel.vue', import.meta.url), 'utf8');
const workspaceActionRow = readFileSync(new URL('../src/components/workspace/WorkspaceActionRow.vue', import.meta.url), 'utf8');
const searchComposable = readFileSync(new URL('../src/components/workspace/useWorkspacePanelSearch.ts', import.meta.url), 'utf8');
const splitComposable = readFileSync(new URL('../src/components/workspace/useWorkspaceSplitPanels.ts', import.meta.url), 'utf8');
const workspacePanel = [
  toolWorkspacePanel,
  jsonWorkspacePanel,
  defaultWorkspacePanel,
  redisWorkspacePanel,
  workspaceActionRow,
  searchComposable,
  splitComposable,
].join('\n');
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

test('supports sorting and minifying JSON at the same time', () => {
  assert.equal(
    applyJsonTransform('{"z":1,"a":{"d":4,"b":2},"m":[{"y":2,"x":1}]}', { mode: 'minify', sortKeys: true }),
    '{"a":{"b":2,"d":4},"m":[{"x":1,"y":2}],"z":1}',
  );
});

test('base64 transform supports decode and encode modes', () => {
  assert.equal(applyBase64Transform('aGVsbG8gYmFja2VuZA==', 'decode'), 'hello backend');
  assert.equal(applyBase64Transform('hello backend', 'encode'), 'aGVsbG8gYmFja2VuZA==');
});

test('finds next editor match after the current selection', () => {
  assert.deepEqual(findEditorMatch('foo bar foo', 'foo', { from: 0, to: 3 }, 'next'), { from: 8, to: 11 });
});

test('finds previous editor match and wraps when needed', () => {
  assert.deepEqual(findEditorMatch('foo bar foo', 'foo', { from: 0, to: 3 }, 'previous'), { from: 8, to: 11 });
});

test('json input actions stay focused on text transforms only', () => {
  assert.match(workspacePanel, /class="workspace-header compact shell-card"/);
  assert.match(jsonWorkspacePanel, /label: "格式化"/);
  assert.match(jsonWorkspacePanel, /label: "压缩"/);
  assert.match(jsonWorkspacePanel, /label: "排序"/);
  assert.match(jsonWorkspacePanel, /label: "实时预览"/);
  assert.match(jsonWorkspacePanel, /label: "转换"/);
  assert.match(jsonWorkspacePanel, /label: "行号"/);
  assert.match(jsonWorkspacePanel, /label: "换行"/);
  assert.match(jsonWorkspacePanel, /label: "清空"/);
  assert.doesNotMatch(workspacePanel, /格式化 JSON|压缩 JSON|排序 JSON/);
  assert.match(jsonWorkspacePanel, /active: workspaceStore\.jsonMode === "format"/);
  assert.match(jsonWorkspacePanel, /active: workspaceStore\.jsonMode === "minify"/);
  assert.match(workspacePanel, /workspaceStore\.jsonSortKeys/);
  assert.match(workspacePanel, /async function prepareJsonTextOutput\(\)/);
  assert.match(workspacePanel, /async function applyJsonMode\(mode: "format" \| "minify"\)/);
  assert.match(workspacePanel, /async function applyJsonSortToggle\(\)/);
  assert.match(workspacePanel, /await prepareJsonTextOutput\(\);[\s\S]*workspaceStore\.jsonMode = mode/);
  assert.match(workspacePanel, /await prepareJsonTextOutput\(\);[\s\S]*workspaceStore\.jsonSortKeys = !workspaceStore\.jsonSortKeys/);
  assert.match(
    workspacePanel,
    /:key="`\$\{workspaceStore\.activeToolId\}:\$\{workspaceStore\.jsonOutputMode\}:\$\{workspaceStore\.jsonMode\}:\$\{workspaceStore\.jsonSortKeys\}:\$\{jsonTextPreview\}`"/,
  );
  assert.match(workspacePanel, /class="panel-header compact"/);
  assert.match(jsonWorkspacePanel, /const jsonInputPrimaryItems = computed/);
  assert.match(jsonWorkspacePanel, /const jsonInputSecondaryItems = computed/);
  assert.match(jsonWorkspacePanel, /<div class="workspace-action-bar">/);
  assert.match(jsonWorkspacePanel, /<div class="workspace-action-bar-left">/);
  assert.match(jsonWorkspacePanel, /<div class="workspace-action-bar-right">/);
  assert.match(
    jsonWorkspacePanel,
    /const jsonInputPrimaryItems[\s\S]*label: "格式化"[\s\S]*label: "压缩"[\s\S]*label: "排序"[\s\S]*label: "实时预览"[\s\S]*label: "转换"/,
  );
  assert.match(jsonWorkspacePanel, /visible: !workspaceStore\.liveMode/);
  assert.match(
    jsonWorkspacePanel,
    /const jsonInputSecondaryItems[\s\S]*label: "行号"[\s\S]*label: "换行"[\s\S]*label: "清空"/,
  );
  assert.doesNotMatch(workspacePanel, /activeTool\.description/);
  assert.doesNotMatch(workspacePanel, /保留原始内容，适合粘贴请求体、时间值、URL 或待转换文本。/);
  assert.doesNotMatch(workspacePanel, /jsonAction === 'tree'/);
});

test('json tool uses brace default placeholder', () => {
  const toolsSource = readFileSync(new URL('../src/lib/tools.ts', import.meta.url), 'utf8');
  assert.match(toolsSource, /id: "json-formatter"[\s\S]*placeholder: "\{\}"[\s\S]*inputLanguage: "json"[\s\S]*outputLanguage: "json"/);
});

test('json output area supports tree mode via collapsible component', () => {
  assert.match(workspacePanel, /VueJsonPretty/);
  assert.match(workspacePanel, /树状视图/);
  assert.match(workspacePanel, /workspaceStore\.jsonOutputMode/);
  assert.match(workspacePanel, /collapsed-node-length/);
});

test('json workspace removes redundant live-preview and output title copy', () => {
  assert.doesNotMatch(actionBar, /实时预览/);
  assert.match(jsonWorkspacePanel, /label: "实时预览"/);
  assert.doesNotMatch(workspacePanel, /JSON 输出结果/);
  assert.match(jsonWorkspacePanel, /pressed: workspaceStore\.liveMode/);
  assert.doesNotMatch(actionBar, /type="checkbox"/);
});

test('toolbar removes example action and top favorite control', () => {
  assert.doesNotMatch(actionBar, />\s*示例\s*</);
  assert.doesNotMatch(actionBar, /toolbar-icon-button/);
  assert.doesNotMatch(actionBar, /★|☆/);
  assert.doesNotMatch(actionBar, /切换星标|收藏工具|取消收藏/);
});

test('toolbar keeps shared actions only', () => {
  assert.match(actionBar, />\s*保存\s*</);
  assert.doesNotMatch(actionBar, /type="checkbox"/);
  assert.match(actionBar, /historyButtonLabel/);
  assert.match(actionBar, /隐藏历史/);
  assert.match(actionBar, /显示历史/);
  assert.match(actionBar, />\s*交换输入输出\s*</);
  assert.match(actionBar, /activeToolId !== 'json-formatter'/);
  assert.doesNotMatch(actionBar, /执行转换|执行调试/);
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
  assert.match(workspaceInspector, /title="一键清空"/);
  assert.equal((workspaceInspector.match(/>\s*删除\s*</g) ?? []).length, 2);
  assert.doesNotMatch(workspaceInspector, /history-card-actions/);
  assert.doesNotMatch(workspaceInspector, /getHistoryToolName/);
});

test('workspace copy and chrome use history panel wording', () => {
  const toolsSource = readFileSync(new URL('../src/lib/tools.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(toolsSource, /状态面板/);
  assert.match(workspaceInspector, /历史中心|历史记录/);
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
  assert.match(workspaceView, /@pointerdown="startResize\('sidebar', \$event\)"/);
  assert.match(workspaceView, /@pointerdown="startResize\('inspector', \$event\)"/);
  assert.match(appCss, /--workspace-sidebar-width/);
  assert.match(appCss, /--workspace-inspector-width/);
  assert.match(appCss, /workspace-resize-handle/);
  assert.match(appCss, /\.workspace-view\s*\{[\s\S]*gap:\s*0/);
});

test('history panel only shows current tool records and limits manual\/auto counts', () => {
  assert.match(workspaceInspector, /entry\.tool_id === workspaceStore\.activeToolId/);
  assert.match(workspaceInspector, /slice\(0,\s*5\)/);
  assert.match(workspaceInspector, /slice\(0,\s*10\)/);
  assert.doesNotMatch(workspaceInspector, /{{ getHistoryToolName\(entry\.tool_id\) }}/);
});

test('json output actions use text buttons and tree controls', () => {
  assert.match(workspacePanel, /copyOutput/);
  assert.match(jsonWorkspacePanel, /label: "换行"/);
  assert.match(jsonWorkspacePanel, /workspaceStore\.outputShowLineNumbers/);
  assert.doesNotMatch(workspaceActionRow, /MoreHorizontal/);
  assert.match(jsonWorkspacePanel, /label: "文本视图"/);
  assert.match(jsonWorkspacePanel, /label: "树状视图"/);
  assert.match(
    jsonWorkspacePanel,
    /const jsonOutputPrimaryItems[\s\S]*label: "文本视图"[\s\S]*label: "树状视图"/,
  );
  assert.match(
    jsonWorkspacePanel,
    /const jsonOutputSecondaryItems[\s\S]*label: "行号"[\s\S]*label: "换行"[\s\S]*label: copyButtonLabel\.value[\s\S]*label: jsonTreeExpanded\.value \? "折叠" : "展开"[\s\S]*label: copyButtonLabel\.value/,
  );
  assert.match(jsonWorkspacePanel, /workspaceStore\.collapseJsonTree\(\)/);
  assert.match(jsonWorkspacePanel, /workspaceStore\.expandJsonTree\(\)/);
  assert.doesNotMatch(workspacePanel, /展示格式化结果、转换结果或工具处理后的预览内容。/);
  assert.match(jsonWorkspacePanel, /<div class="workspace-action-bar">/);
  assert.match(jsonWorkspacePanel, /<WorkspaceActionRow :items="jsonOutputPrimaryItems" \/>/);
  assert.match(jsonWorkspacePanel, /<WorkspaceActionRow :items="jsonOutputSecondaryItems" \/>/);
});

test('default workspace output actions follow json-style right-side ordering', () => {
  assert.match(
    defaultWorkspacePanel,
    /const outputActionItems[\s\S]*label: "行号"[\s\S]*label: "换行"[\s\S]*label: copyButtonLabel\.value/,
  );
  assert.match(defaultWorkspacePanel, /const inputLanguage = computed\(\(\) => workspaceStore\.activeTool\.inputLanguage \?\? "text"\)/);
  assert.match(defaultWorkspacePanel, /const outputLanguage = computed\(\(\) => workspaceStore\.activeTool\.outputLanguage \?\? "text"\)/);
  assert.match(defaultWorkspacePanel, /:language="inputLanguage"/);
  assert.match(defaultWorkspacePanel, /:language="outputLanguage"/);
  assert.doesNotMatch(defaultWorkspacePanel, /sampleOutputTitle/);
  assert.match(
    defaultWorkspacePanel,
    /<div class="workspace-action-bar">[\s\S]*<div class="workspace-action-bar-left" ?\/>[\s\S]*<div class="workspace-action-bar-right">[\s\S]*<WorkspaceActionRow :items="outputActionItems" \/>/,
  );
});

test('base64 tool exposes decode and encode toggles on the left and defaults to decode', () => {
  const toolsSource = readFileSync(new URL('../src/lib/tools.ts', import.meta.url), 'utf8');
  assert.match(
    toolsSource,
    /id: "base64"[\s\S]*placeholder: "aGVsbG8gYmFja2VuZA=="[\s\S]*sampleOutput: "hello backend"[\s\S]*inputLanguage: "text"[\s\S]*outputLanguage: "text"/,
  );
  assert.match(workspaceStore, /const base64Mode = ref<Base64TransformMode>\("decode"\)/);
  assert.match(workspaceStore, /if \(activeTool\.value\.id === "base64"\)/);
  assert.match(workspaceStore, /return `Base64 转换失败：/);
  assert.match(
    defaultWorkspacePanel,
    /workspaceStore\.activeTool\.id === "base64"[\s\S]*label: "解码"[\s\S]*workspaceStore\.base64Mode === "decode"[\s\S]*label: "编码"[\s\S]*workspaceStore\.base64Mode === "encode"[\s\S]*label: "实时预览"/,
  );
});

test('input and output areas expose a single toggleable search overlay inside content areas', () => {
  assert.match(workspacePanel, /input-search-query/);
  assert.match(workspacePanel, /output-search-query/);
  assert.match(workspacePanel, />\s*上一个\s*</);
  assert.match(workspacePanel, />\s*下一个\s*</);
  assert.match(workspacePanel, /const inputSearchVisible = ref\(false\);/);
  assert.match(workspacePanel, /const outputSearchVisible = ref\(false\);/);
  assert.match(workspacePanel, /window\.addEventListener\("keydown", handleSearchShortcut, true\)/);
  assert.match(workspacePanel, /event\.key\.toLowerCase\(\) !== "f"/);
  assert.match(workspacePanel, /class="editor-search-row editor-search-row--overlay"/);
  assert.match(workspacePanel, /class="editor-search-overlay"/);
  assert.match(workspacePanel, /class="editor-content-shell"/);
  assert.match(workspacePanel, /const inputContentRef = ref<HTMLElement \| null>\(null\);/);
  assert.match(workspacePanel, /const outputContentRef = ref<HTMLElement \| null>\(null\);/);
  assert.match(workspacePanel, /inputContentRef\.value\?\.contains\(target\) \|\| inputSearchInputRef\.value\?\.contains\(target\)/);
  assert.match(workspacePanel, /outputContentRef\.value\?\.contains\(target\) \|\| outputSearchInputRef\.value\?\.contains\(target\)/);
  assert.doesNotMatch(workspacePanel, /inputPanelRef|outputPanelRef|focusedPanel/);
});

test('copy result action exposes visible success or failure feedback', () => {
  assert.match(workspacePanel, /const copyFeedback = ref<"idle" \| "success" \| "error">\("idle"\);/);
  assert.match(workspacePanel, /const copyButtonLabel = computed\(\(\) =>/);
  assert.match(workspacePanel, /return "复制"/);
  assert.match(workspacePanel, /label: copyButtonLabel\.value/);
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
  assert.match(workspaceStore, /const inputShowLineNumbers = ref\(false\)/);
  assert.match(workspaceStore, /const outputShowLineNumbers = ref\(false\)/);
  assert.match(workspaceStore, /const inputSoftWrap = ref\(true\)/);
  assert.match(workspaceStore, /const outputSoftWrap = ref\(false\)/);
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
  assert.match(workspacePanel, /<CodeEditor[\s\S]*:model-value="jsonTextPreview"/);
  assert.match(workspacePanel, /:language="'json'"/);
  assert.match(workspacePanel, /:readonly="true"/);
  assert.match(workspacePanel, /:show-line-numbers="workspaceStore\.inputShowLineNumbers"/);
  assert.match(workspacePanel, /:show-line-numbers="workspaceStore\.outputShowLineNumbers"/);
  assert.match(workspacePanel, /:wrap="workspaceStore\.inputSoftWrap"/);
  assert.match(workspacePanel, /:wrap="workspaceStore\.outputSoftWrap"/);
  assert.match(workspacePanel, /@update:model-value="workspaceStore\.setInputValue"/);
  assert.match(workspacePanel, /@blur="workspaceStore\.saveAutoHistoryOnInputBlur"/);
  assert.doesNotMatch(workspacePanel, /输入区|输出区/);
});

test('known tools declare matching syntax highlight languages and remove output titles', () => {
  const toolsSource = readFileSync(new URL('../src/lib/tools.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(toolsSource, /sampleOutputTitle:/);
  assert.match(toolsSource, /id: "query-parser"[\s\S]*outputLanguage: "json"/);
  assert.match(toolsSource, /id: "header-editor"[\s\S]*outputLanguage: "json"/);
  assert.match(toolsSource, /id: "redis-lua-debug-console"[\s\S]*inputLanguage: "lua"[\s\S]*outputLanguage: "json"/);
  assert.match(redisWorkspacePanel, /:language="'lua'"/);
  assert.match(redisWorkspacePanel, /:language="'json'"/);
});

test('readonly output editor does not write transformed text back into input', () => {
  assert.match(jsonWorkspacePanel, /<CodeEditor[\s\S]*:model-value="jsonTextPreview"/);
  assert.doesNotMatch(
    jsonWorkspacePanel,
    /<CodeEditor[\s\S]*:model-value="jsonTextPreview"[\s\S]*@update:model-value="workspaceStore\.setInputValue"/,
  );
});

test('workspace routes JSON tool to a dedicated panel component', () => {
  assert.match(toolWorkspacePanel, /import JsonToolWorkspacePanel from "\.\/JsonToolWorkspacePanel\.vue"/);
  assert.match(toolWorkspacePanel, /case "json-formatter":/);
  assert.match(toolWorkspacePanel, /return JsonToolWorkspacePanel/);
});

test('manual run action lives with input-side controls', () => {
  assert.match(jsonWorkspacePanel, /label: "转换"/);
  assert.match(defaultWorkspacePanel, /label: "转换"/);
  assert.match(defaultWorkspacePanel, /visible: !workspaceStore\.liveMode/);
  assert.match(redisWorkspacePanel, /label: workspaceStore\.redisLuaIsRunning \? "执行中\.\.\." : "执行调试"/);
  assert.match(appCss, /\.primary-button\.small\s*\{/);
});

test('json tool uses brace default output sample', () => {
  const toolsSource = readFileSync(new URL('../src/lib/tools.ts', import.meta.url), 'utf8');
  assert.match(toolsSource, /id: "json-formatter"[\s\S]*sampleOutput: "\{\}"/);
});

test('workspace action row renders visible actions directly without overflow menu', () => {
  assert.match(workspaceActionRow, /const visibleItems = computed/);
  assert.doesNotMatch(workspaceActionRow, /ResizeObserver|MoreHorizontal|workspace-action-overflow-menu|aria-label="更多功能"/);
  assert.doesNotMatch(workspaceActionRow, /<component :is="item\.icon"/);
  assert.match(appCss, /\.workspace-action-bar-left/);
  assert.match(appCss, /\.workspace-action-bar-right/);
});

test('package installs codemirror and github-style theme support', () => {
  assert.match(packageJson, /vue-codemirror6/);
  assert.match(packageJson, /@codemirror\/lang-json/);
  assert.match(packageJson, /@codemirror\/language/);
  assert.match(packageJson, /@codemirror\/legacy-modes/);
  assert.match(packageJson, /github/i);
});

test('app styles include codemirror panel hooks', () => {
  assert.match(appCss, /code-editor-shell/);
  assert.match(appCss, /\.cm-editor/);
  assert.match(appCss, /\.panel-header-tools/);
  assert.match(appCss, /\.editor-search-overlay/);
  assert.match(appCss, /\.editor-search-row--overlay/);
});

test('code editor exposes search locate methods', () => {
  assert.match(codeEditor, /defineExpose\(/);
  assert.match(codeEditor, /findNextMatch/);
  assert.match(codeEditor, /findPreviousMatch/);
  assert.match(codeEditor, /emit\("blur"\)/);
  assert.match(codeEditor, /@focusout="handleFocusOut"/);
  assert.match(codeEditor, /@ready=/);
  assert.match(codeEditor, /StreamLanguage/);
  assert.match(codeEditor, /import \{ lua \} from "@codemirror\/legacy-modes\/mode\/lua"/);
  assert.match(codeEditor, /language\?: "json" \| "lua" \| "text"/);
});

test('code editor supports hiding line numbers by default', () => {
  assert.match(codeEditor, /showLineNumbers\?: boolean/);
  assert.match(codeEditor, /wrap\?: boolean/);
  assert.match(codeEditor, /wrap: true/);
  assert.match(codeEditor, /:wrap="props\.wrap"/);
  assert.match(codeEditor, /code-editor-shell--hide-line-numbers/);
});
