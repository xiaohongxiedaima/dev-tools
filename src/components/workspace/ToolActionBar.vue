<script setup lang="ts">
import { useWorkspaceStore } from "../../stores/workspace";

const workspaceStore = useWorkspaceStore();

async function saveHistory() {
  try {
    await workspaceStore.saveCurrentHistoryEntry();
  } catch (error) {
    workspaceStore.errorMessage = error instanceof Error ? error.message : String(error);
  }
}
</script>

<template>
  <div class="workspace-toolbar">
    <button class="ghost-button" type="button" @click="saveHistory">保存历史</button>
    <button
      class="ghost-button"
      :class="{ 'json-action-active': workspaceStore.showLineNumbers }"
      type="button"
      :aria-pressed="workspaceStore.showLineNumbers"
      @click="workspaceStore.setShowLineNumbers(!workspaceStore.showLineNumbers)"
    >
      显示行号
    </button>
    <button class="ghost-button" type="button" @click="workspaceStore.setInputValue('')">清空</button>
    <button class="ghost-button" type="button" @click="workspaceStore.swapInputAndOutputPreview()">交换输入输出</button>
    <button v-if="!workspaceStore.liveMode" class="primary-button" type="button" @click="workspaceStore.runCurrentTransform()">
      执行转换
    </button>
  </div>
</template>
