import type { App } from 'vue'
import type { Router } from 'vue-router'

import { beforeEach, describe, expect, test } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { useRouteState } from '../src/router/use-route-state'
import { useRouteStates } from '../src/router/use-route-states'

let app: App
let router: Router

beforeEach(async () => {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'root', component: { template: '<div />' } },
      { path: '/item/:id', name: 'item', component: { template: '<div />' } },
    ],
  })
  app = createApp({ render: () => null })
  app.use(router)
  await router.push('/')
  await router.isReady()
})

function run<T>(fn: () => T): T {
  return app.runWithContext(fn) as T
}

async function flush() {
  await new Promise(resolve => setTimeout(resolve, 0))
  await nextTick()
}

const PAGE = { key: 'page', parser: { name: 'parseAsInteger', defaultValue: 1 } } as const
const QUERY = { key: 'q', parser: { name: 'parseAsString' } } as const

describe('useRouteState', () => {
  test('reads the value from the query string', async () => {
    await router.push('/?page=4&q=vue')

    const page = run(() => useRouteState(PAGE))
    const q = run(() => useRouteState(QUERY))

    expect(page.value).toBe(4)
    expect(q.value).toBe('vue')
  })

  test('falls back to the parser default when the key is absent', () => {
    const page = run(() => useRouteState(PAGE))
    const q = run(() => useRouteState(QUERY))

    expect(page.value).toBe(1)
    expect(q.value).toBeNull()
  })

  test('writes the value to the URL', async () => {
    const q = run(() => useRouteState(QUERY))
    q.value = 'headphones'
    await flush()

    expect(router.currentRoute.value.query.q).toBe('headphones')
  })

  test('null clears the key and falls back to the default', async () => {
    await router.push('/?page=7')

    const page = run(() => useRouteState(PAGE))
    expect(page.value).toBe(7)

    page.value = null
    await flush()

    expect(router.currentRoute.value.query.page).toBeUndefined()
    expect(page.value).toBe(1)
  })

  test('clearOnDefault drops a value equal to the default', async () => {
    const page = run(() => useRouteState(PAGE))
    page.value = 1
    await flush()

    expect(router.currentRoute.value.query.page).toBeUndefined()
  })

  test('clearOnDefault=false keeps a value equal to the default in the URL', async () => {
    const page = run(() => useRouteState({ ...PAGE, clearOnDefault: false }))
    page.value = 1
    await flush()

    expect(router.currentRoute.value.query.page).toBe('1')
  })

  test('history:replace does not add a history entry', async () => {
    const q = run(() => useRouteState(QUERY))
    q.value = 'x'
    await flush()
    const afterWrite = router.currentRoute.value.fullPath

    router.back()
    await flush()

    expect(router.currentRoute.value.fullPath).toBe(afterWrite)
  })

  test('history:push adds a history entry', async () => {
    const q = run(() => useRouteState({ ...QUERY, history: 'push' }))
    q.value = 'x'
    await flush()

    router.back()
    await flush()

    expect(router.currentRoute.value.query.q).toBeUndefined()
  })

  test('source:params reads from and writes to route.params', async () => {
    await router.push('/item/1')
    const id = run(() =>
      useRouteState({ key: 'id', parser: { name: 'parseAsInteger' }, source: 'params' }),
    )

    expect(id.value).toBe(1)

    id.value = 9
    await flush()

    expect(router.currentRoute.value.params.id).toBe('9')
    expect(router.currentRoute.value.query.id).toBeUndefined()
  })
})

describe('useRouteStates', () => {
  test('exposes per-key refs', async () => {
    await router.push('/?page=4&q=vue')
    const state = run(() => useRouteStates([PAGE, QUERY]))

    expect(state.page.value).toBe(4)
    expect(state.q.value).toBe('vue')
  })

  test('individual writes still navigate the URL', async () => {
    const state = run(() => useRouteStates([PAGE, QUERY]))
    state.q.value = 'vue'
    await flush()

    expect(router.currentRoute.value.query.q).toBe('vue')
  })

  test('set writes several keys in a single navigation', async () => {
    const state = run(() => useRouteStates([PAGE, QUERY]))
    let navigations = 0
    router.afterEach(() => navigations++)

    state.set({ page: 3, q: 'vue' })
    await flush()

    expect(navigations).toBe(1)
    expect(router.currentRoute.value.query).toEqual({ page: '3', q: 'vue' })
  })

  test('set with null values clears the keys', async () => {
    await router.push('/?page=3&q=vue')
    const state = run(() => useRouteStates([PAGE, QUERY]))

    state.set({ page: null, q: null })
    await flush()

    expect(router.currentRoute.value.query).toEqual({})
  })

  test('set only affects keys present in the patch', async () => {
    await router.push('/?page=3&q=vue')
    const state = run(() => useRouteStates([PAGE, QUERY]))

    state.set({ q: 'react' })
    await flush()

    expect(router.currentRoute.value.query).toEqual({ page: '3', q: 'react' })
  })

  test('reset restores parser defaults and clears the URL', async () => {
    await router.push('/?page=8&q=vue')
    const state = run(() => useRouteStates([PAGE, QUERY]))

    state.reset()
    await flush()

    expect(router.currentRoute.value.query).toEqual({})
    expect(state.page.value).toBe(1)
    expect(state.q.value).toBeNull()
  })

  test('toObject mirrors the current refs', async () => {
    await router.push('/?page=2&q=x')
    const state = run(() => useRouteStates([PAGE, QUERY]))

    expect(state.toObject()).toEqual({ page: 2, q: 'x' })
  })

  test('any push in the batch upgrades the navigation to push', async () => {
    const state = run(() => useRouteStates([PAGE, { ...QUERY, history: 'push' }]))

    state.set({ page: 5, q: 'y' })
    await flush()
    router.back()
    await flush()

    expect(router.currentRoute.value.query).toEqual({})
  })

  test('call-site override wins over per-key history', async () => {
    const state = run(() => useRouteStates([PAGE, { ...QUERY, history: 'push' }]))

    state.set({ page: 5, q: 'y' }, { history: 'replace' })
    await flush()
    const after = router.currentRoute.value.fullPath

    router.back()
    await flush()

    expect(router.currentRoute.value.fullPath).toBe(after)
  })
})
