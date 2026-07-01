<script setup lang="ts">
import { computed } from "vue";

export type WorkspaceActionItem = {
  key: string;
  label: string;
  variant?: "ghost" | "primary";
  active?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  title?: string;
  visible?: boolean;
  onClick: () => void | Promise<void>;
};

const props = defineProps<{
  items: WorkspaceActionItem[];
}>();

const visibleItems = computed(() => props.items.filter((item) => item.visible !== false));
</script>

<template>
  <div class="workspace-action-row">
    <button
      v-for="item in visibleItems"
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
