<script setup lang="ts">
defineProps<{ label: string; value: string }>()
</script>

<template>
  <div class="demo">
    <div class="demo-bar">
      <span class="demo-bar-label">{{ label }}</span>
      <code class="demo-bar-value">{{ value }}</code>
      <span class="demo-bar-actions">
        <slot name="actions" />
      </span>
    </div>
    <div class="demo-preview">
      <slot name="preview" />
    </div>
  </div>
</template>
