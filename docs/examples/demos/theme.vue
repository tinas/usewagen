<script setup lang="ts">
import { parseAsStringLiteral } from 'usewagen'
import { useLocalStorage } from 'usewagen/storage'

const theme = useLocalStorage({
  key: 'theme',
  parser: parseAsStringLiteral(['light', 'dark']).withDefault('light'),
})
</script>

<template>
  <div class="demo-row">
    <select v-model="theme">
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>

    <span>The {{ theme }} theme is stored.</span>
  </div>
</template>
