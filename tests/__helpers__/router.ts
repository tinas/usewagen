import type { App } from 'vue'
import type { RouteRecordRaw, Router } from 'vue-router'

import { beforeEach } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

const DEFAULT_ROUTES: RouteRecordRaw[] = [
  { path: '/', name: 'root', component: { template: '<div />' } },
  { path: '/item/:id', name: 'item', component: { template: '<div />' } },
]

export interface RouterHarness {
  readonly app: App
  readonly router: Router
  run: <T>(fn: () => T) => T
}

export function setupRouter(routes: RouteRecordRaw[] = DEFAULT_ROUTES): RouterHarness {
  let app: App
  let router: Router

  beforeEach(async () => {
    router = createRouter({ history: createMemoryHistory(), routes })
    app = createApp({ render: () => null })
    app.use(router)
    await router.push('/')
    await router.isReady()
  })

  return {
    get app() {
      return app
    },
    get router() {
      return router
    },
    run: fn => app.runWithContext(fn) as ReturnType<typeof fn>,
  }
}

export async function flush() {
  await new Promise(resolve => setTimeout(resolve, 0))
  await nextTick()
}
