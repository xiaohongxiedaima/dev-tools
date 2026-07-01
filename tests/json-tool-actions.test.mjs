import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyJsonTransform } from '../src/lib/json-tools.ts';
import { findEditorMatch } from '../src/lib/editor-search.ts';

const actionBar = readFileSync(new URL('../src/components/workspace/ToolActionBar.vue', import.meta.url), 'utf8');
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
  assert.match(workspacePanel, /格式化 JSON/);
  assert.match(workspacePanel, /压缩 JSON/);
  assert.match(workspacePanel, /排序 JSON/);
  assert.doesNotMatch(workspacePanel, /jsonAction === 'tree'/);
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
});

test('toolbar removes example action and top favorite control', () => {
  assert.doesNotMatch(actionBar, />\s*示例\s*</);
  assert.doesNotMatch(actionBar, /toolbar-icon-button/);
  assert.doesNotMatch(actionBar, /★|☆/);
  assert.doesNotMatch(actionBar, /切换星标|收藏工具|取消收藏/);
});

test('toolbar uses text buttons for clear and swap actions', () => {
  assert.match(actionBar, />\s*清空\s*</);
  assert.match(actionBar, />\s*交换输入输出\s*</);
});

test('json output actions use text buttons and tree controls', () => {
  assert.match(workspacePanel, /copyOutput/);
  assert.match(workspacePanel, />\s*文本视图\s*</);
  assert.match(workspacePanel, />\s*树状视图\s*</);
  assert.match(workspacePanel, />\s*一键展开\s*</);
  assert.match(workspacePanel, />\s*一键折叠\s*</);
  assert.match(workspacePanel, /<p>展示格式化结果、转换结果或工具处理后的预览内容。<\/p>\s*<div class="json-output-action-row">/);
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
  assert.match(workspacePanel, /@update:model-value="workspaceStore\.setInputValue"/);
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
  assert.match(codeEditor, /@ready=/);
});
