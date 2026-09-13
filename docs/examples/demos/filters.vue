<script setup lang="ts">
import { parseAsArrayOf, parseAsInteger, parseAsString } from 'usewagen'
import { useRouteStates } from 'usewagen/router'

const available = ['vue', 'vite', 'nuxt']

const { q, tags, page, set, reset } = useRouteStates([
  { key: 'q' },
  { key: 'tags', parser: parseAsArrayOf(parseAsString).withDefault([]) },
  { key: 'page', parser: parseAsInteger.withDefault(1) },
])

function toggle(tag: string) {
  const next = tags.value.includes(tag)
    ? tags.value.filter(item => item !== tag)
    : [...tags.value, tag]

  set({ tags: next, page: 1 })
}
</script>

<template>
  <div class="demo-row">
    <input v-model="q" placeholder="Search" />

    <label v-for="tag in available" :key="tag">
      <input type="checkbox" :checked="tags.includes(tag)" @change="toggle(tag)" />
      {{ tag }}
    </label>

    <button @click="page++">Page {{ page }}</button>
    <button @click="reset()">Reset</button>
  </div>
</template>
