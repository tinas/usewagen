<script setup lang="ts">
import type { App, Component } from 'vue'
import type { Router } from 'vue-router'

import { createApp, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createWagen } from 'usewagen'

import DemoFrame from './DemoFrame.vue'

const props = defineProps<{ demo: Component; start?: string }>()

const host = ref<HTMLElement>()
const fullPath = ref(props.start ?? '/')
const depth = ref(0)
const router = shallowRef<Router>()
let app: App | undefined
let wagen: ReturnType<typeof createWagen> | undefined

onMounted(async () => {
  const instance = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:path(.*)*', component: { render: () => null } }],
  })

  instance.afterEach(to => {
    fullPath.value = to.fullPath
  })

  await instance.replace(props.start ?? '/')
  await instance.isReady()

  const push = instance.push.bind(instance)
  instance.push = to => {
    depth.value++
    return push(to)
  }

  wagen = createWagen()
  app = createApp(props.demo)
  app.use(instance)
  app.use(wagen)
  app.mount(host.value!)

  router.value = instance
})

onBeforeUnmount(() => {
  app?.unmount()
  wagen?.destroy()
})

function back() {
  if (depth.value === 0) return

  depth.value--
  router.value?.back()
}

function reset() {
  depth.value = 0
  void router.value?.replace(props.start ?? '/')
}
</script>

<template>
  <DemoFrame label="URL" :value="fullPath">
    <template #actions>
      <button type="button" :disabled="depth === 0" @click="back">Back</button>
      <button type="button" @click="reset">Reset</button>
    </template>
    <template #preview>
      <div ref="host" />
    </template>
  </DemoFrame>
</template>
