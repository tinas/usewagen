<script setup lang="ts">
import { computed } from 'vue'
import { parseAsDate } from 'usewagen'
import { useRouteStates } from 'usewagen/router'

type Range = [Date, Date]

const { startDate, endDate, set } = useRouteStates([
  { key: 'startDate', parser: parseAsDate },
  { key: 'endDate', parser: parseAsDate },
])

const range = computed({
  get: (): Range | null => {
    const start = startDate.value
    const end = endDate.value
    return start && end && start <= end ? [start, end] : null
  },
  set: (next: Range | null) => {
    if (!next) {
      set({ startDate: null, endDate: null })
      return
    }
    const [start, end] = next[0] <= next[1] ? next : [next[1], next[0]]
    set({ startDate: start, endDate: end })
  },
})

function pick(index: 0 | 1, event: Event) {
  const picked = (event.target as HTMLInputElement).valueAsDate
  if (!picked) {
    range.value = null
    return
  }
  const next: Range = [startDate.value ?? picked, endDate.value ?? picked]
  next[index] = picked
  range.value = next
}

function asInput(date: Date | null) {
  return date ? parseAsDate.serialize(date) : ''
}
</script>

<template>
  <div class="demo-row">
    <input type="date" :value="asInput(startDate)" @change="pick(0, $event)" />
    <span>to</span>
    <input type="date" :value="asInput(endDate)" @change="pick(1, $event)" />
    <button :disabled="!startDate && !endDate" @click="range = null">Clear</button>
  </div>

  <p v-if="range">{{ asInput(range[0]) }} to {{ asInput(range[1]) }} is selected.</p>
  <p v-else>No range is selected.</p>
</template>
