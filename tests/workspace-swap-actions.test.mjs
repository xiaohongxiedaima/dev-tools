import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const actionBar = readFileSync(new URL('../src/components/workspace/ToolActionBar.vue', import.meta.url), 'utf8');
const workspacePanel = readFileSync(new URL('../src/components/workspace/ToolWorkspacePanel.vue', import.meta.url), 'utf8');

test('workspace exposes a single swap entry point', () => {
  assert.match(actionBar, /交换输入输出/);
  assert.doesNotMatch(workspacePanel, />\s*交换\s*</);
  assert.equal((workspacePanel.match(/swapInputAndOutputPreview/g) ?? []).length, 0);
});
