<script setup lang="ts">
import type { App, Component } from 'vue'

import { createApp, onBeforeUnmount, onMounted, ref } from 'vue'
import { createWagen } from 'usewagen'

import DemoFrame from './DemoFrame.vue'

const props = defineProps<{ demo: Component; area?: 'local' | 'session' }>()

const host = ref<HTMLElement>()
const entries = ref<string>('empty')
let app: App | undefined
let wagen: ReturnType<typeof createWagen> | undefined
let stop: (() => void) | undefined

function storage() {
  return props.area === 'session' ? wagen!.storage.session : wagen!.storage.local
}

function read() {
  const instance = storage()
  const found = instance.keys().map(key => `${instance.prefix}${key}=${instance.getItem(key)}`)
  entries.value = found.length > 0 ? found.join(' ') : 'empty'
}

onMounted(() => {
  wagen = createWagen({ storage: { prefix: 'docs:', default: props.area ?? 'local' } })

  app = createApp(props.demo)
  app.use(wagen)
  app.mount(host.value!)

  stop = storage().subscribe(() => read())
  read()
})

onBeforeUnmount(() => {
  stop?.()
  app?.unmount()
  wagen?.destroy()
})

function clear() {
  storage().clear()
  read()
}
</script>

<template>
  <DemoFrame :label="area === 'session' ? 'sessionStorage' : 'localStorage'" :value="entries">
    <template #actions>
      <button type="button" @click="clear">Clear</button>
    </template>
    <template #preview>
      <div ref="host" />
    </template>
  </DemoFrame>
</template>
