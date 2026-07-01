import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const actionBar = readFileSync(new URL('../src/components/workspace/ToolActionBar.vue', import.meta.url), 'utf8');
const toolWorkspacePanel = readFileSync(new URL('../src/components/workspace/ToolWorkspacePanel.vue', import.meta.url), 'utf8');
const jsonWorkspacePanel = readFileSync(new URL('../src/components/workspace/JsonToolWorkspacePanel.vue', import.meta.url), 'utf8');
const redisWorkspacePanel = readFileSync(new URL('../src/components/workspace/RedisLuaToolWorkspacePanel.vue', import.meta.url), 'utf8');
const defaultWorkspacePanel = readFileSync(new URL('../src/components/workspace/DefaultToolWorkspacePanel.vue', import.meta.url), 'utf8');
const workspacePanel = `${toolWorkspacePanel}\n${jsonWorkspacePanel}\n${redisWorkspacePanel}\n${defaultWorkspacePanel}`;

test('workspace exposes a single swap entry point', () => {
  assert.match(actionBar, /交换输入输出/);
  assert.match(actionBar, /activeToolId !== 'json-formatter'/);
  assert.doesNotMatch(workspacePanel, />\s*交换\s*</);
  assert.equal((workspacePanel.match(/swapInputAndOutputPreview/g) ?? []).length, 0);
});
