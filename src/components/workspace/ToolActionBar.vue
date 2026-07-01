<script setup lang="ts">
import { useWorkspaceStore } from "../../stores/workspace";

const workspaceStore = useWorkspaceStore();
</script>

<template>
  <div class="workspace-toolbar">
    <button class="ghost-button" type="button" @click="workspaceStore.setInputValue('')">清空</button>
    <button class="ghost-button" type="button" @click="workspaceStore.swapInputAndOutputPreview()">交换输入输出</button>
    <button v-if="!workspaceStore.liveMode" class="primary-button" type="button" @click="workspaceStore.runCurrentTransform()">
      执行转换
    </button>
  </div>
</template>
