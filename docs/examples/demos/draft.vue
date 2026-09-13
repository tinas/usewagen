<script setup lang="ts">
import { parseAsJson } from 'usewagen'
import { useSessionStorage } from 'usewagen/storage'

interface Draft {
  title: string
  body: string
}

const draft = useSessionStorage({
  key: 'draft',
  parser: parseAsJson<Draft>().withDefault({ title: '', body: '' }),
})

function update(field: keyof Draft, event: Event) {
  const { value } = event.target as HTMLInputElement
  draft.value = { ...draft.value, [field]: value }
}

function discard() {
  draft.value = null
}
</script>

<template>
  <div class="demo-row">
    <input :value="draft.title" placeholder="Title" @input="update('title', $event)" />
    <input :value="draft.body" placeholder="Body" @input="update('body', $event)" />
    <button @click="discard">Discard</button>
  </div>
</template>
