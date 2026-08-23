import type { App } from 'vue'
import type { Router } from 'vue-router'

import { beforeEach, describe, expect, test } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { useRouteHash } from '../src/router/use-route-hash'
import { defineParser } from '../src/parser/parsers'

let app: App
let router: Router

beforeEach(async () => {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', name: 'root', component: { template: '<div />' } }],
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

describe('useRouteHash', () => {
  test('reads the hash verbatim including the # prefix', async () => {
    await router.push('/#section')

    const hash = run(() => useRouteHash())

    expect(hash.value).toBe('#section')
  })

  test('returns null when the URL has no hash and no default is provided', () => {
    const hash = run(() => useRouteHash())

    expect(hash.value).toBeNull()
  })

  test('falls back to the default when the URL has no hash', () => {
    const hash = run(() =>
      useRouteHash({ parser: { name: 'parseAsString', defaultValue: '#home' } }),
    )

    expect(hash.value).toBe('#home')
  })

  test('writes the value verbatim (user owns the # prefix)', async () => {
    const hash = run(() => useRouteHash())
    hash.value = '#about'
    await flush()

    expect(router.currentRoute.value.hash).toBe('#about')
  })

  test('round-trips a value written with a # prefix', async () => {
    const hash = run(() => useRouteHash())
    hash.value = '#about'
    await flush()

    expect(hash.value).toBe('#about')
  })

  test('null clears the hash and falls back to the default', async () => {
    await router.push('/#existing')

    const hash = run(() =>
      useRouteHash({ parser: { name: 'parseAsString', defaultValue: '#home' } }),
    )
    hash.value = null
    await flush()

    expect(router.currentRoute.value.hash).toBe('')
    expect(hash.value).toBe('#home')
  })

  test('clearOnDefault drops a value equal to the default', async () => {
    const hash = run(() =>
      useRouteHash({ parser: { name: 'parseAsString', defaultValue: '#home' } }),
    )
    hash.value = '#home'
    await flush()

    expect(router.currentRoute.value.hash).toBe('')
  })

  test('clearOnDefault=false keeps a value equal to the default', async () => {
    const hash = run(() =>
      useRouteHash({
        parser: { name: 'parseAsString', defaultValue: '#home' },
        clearOnDefault: false,
      }),
    )
    hash.value = '#home'
    await flush()

    expect(router.currentRoute.value.hash).toBe('#home')
  })

  test('supports a custom parser that owns the # prefix', async () => {
    const parseAsHashInteger = defineParser<number>({
      parse: v => {
        const n = Number.parseInt(v.replace(/^#/, ''), 10)
        return Number.isNaN(n) ? null : n
      },
      serialize: v => `#${v}`,
    })

    await router.push('/#42')

    const hash = run(() => useRouteHash({ parser: parseAsHashInteger }))
    expect(hash.value).toBe(42)

    hash.value = 7
    await flush()
    expect(router.currentRoute.value.hash).toBe('#7')
  })

  test('history:replace does not add a history entry', async () => {
    const hash = run(() => useRouteHash())
    hash.value = '#a'
    await flush()
    const after = router.currentRoute.value.fullPath

    router.back()
    await flush()

    expect(router.currentRoute.value.fullPath).toBe(after)
  })

  test('history:push adds a history entry', async () => {
    const hash = run(() => useRouteHash({ history: 'push' }))
    hash.value = '#a'
    await flush()

    router.back()
    await flush()

    expect(router.currentRoute.value.hash).toBe('')
  })

  test('preserves query and params on navigation', async () => {
    await router.push('/?page=2')
    const hash = run(() => useRouteHash())

    hash.value = '#section'
    await flush()

    expect(router.currentRoute.value.query.page).toBe('2')
    expect(router.currentRoute.value.hash).toBe('#section')
  })
})
