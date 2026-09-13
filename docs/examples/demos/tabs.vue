<script setup lang="ts">
import { parseAsStringLiteral } from 'usewagen'
import { useRouteState } from 'usewagen/router'

const tabs = ['overview', 'activity', 'settings'] as const

const tab = useRouteState({
  key: 'tab',
  parser: parseAsStringLiteral(tabs).withDefault('overview'),
  history: 'push',
})
</script>

<template>
  <div class="demo-row">
    <button v-for="name in tabs" :key="name" :disabled="tab === name" @click="tab = name">
      {{ name }}
    </button>
  </div>

  <p>Showing the {{ tab }} tab.</p>
</template>
