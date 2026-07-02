<script setup lang="ts">
import { computed, type Component } from "vue";

export type WorkspaceActionItem = {
  key: string;
  label: string;
  variant?: "ghost" | "primary";
  active?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  title?: string;
  visible?: boolean;
  icon?: Component;
  onClick: () => void | Promise<void>;
};

const props = defineProps<{
  items: WorkspaceActionItem[];
  grouped?: boolean;
}>();

const iconItems = computed(() =>
  props.items.filter((item) => item.visible !== false && item.icon),
);
const textItems = computed(() =>
  props.items.filter((item) => item.visible !== false && !item.icon),
);
</script>

<template>
  <div class="workspace-action-row">
    <div v-if="grouped && iconItems.length" class="editor-btn-group">
      <button
        v-for="item in iconItems"
        :key="item.key"
        class="ghost-button small icon-only editor-toolbar-btn"
        :class="{ 'json-action-active': item.active }"
        type="button"
        :aria-pressed="item.pressed"
        :disabled="item.disabled"
        :title="item.title ?? item.label"
        @click="item.onClick()"
      >
        <component :is="item.icon" :size="15" />
      </button>
    </div>
    <button
      v-for="item in textItems"
      :key="item.key"
      :class="[item.variant === 'primary' ? 'primary-button small' : 'ghost-button small', { 'json-action-active': item.active }]"
      type="button"
      :aria-pressed="item.pressed"
      :disabled="item.disabled"
      :title="item.title ?? item.label"
      @click="item.onClick()"
    >
      <span>{{ item.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.editor-btn-group {
  display: inline-flex;
  align-items: center;
}

.editor-toolbar-btn {
  width: 30px;
  min-width: 30px;
  height: 28px;
  padding: 0;
  border-radius: 0;
  display: inline-grid;
  place-items: center;
}

.editor-btn-group .editor-toolbar-btn:not(:first-child) {
  border-left: none;
}

.editor-toolbar-btn:first-child {
  border-radius: 8px 0 0 8px;
}

.editor-toolbar-btn:last-child {
  border-radius: 0 8px 8px 0;
}

.editor-toolbar-btn:only-child {
  border-radius: 8px;
}
</style>
