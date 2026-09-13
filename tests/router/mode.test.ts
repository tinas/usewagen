import { describe, expect, test } from 'vite-plus/test'
import { ref } from 'vue'

import { parseAsInteger, parseAsString } from '../../src/parser/parsers'
import { useRouteHash } from '../../src/router/use-route-hash'
import { useRouteState } from '../../src/router/use-route-state'
import { useRouteStates } from '../../src/router/use-route-states'
import { flush, setupRouter } from '../__helpers__/router'
import { createMemoryWagen } from '../__helpers__/wagen'

const ctx = setupRouter()
const { run } = ctx

describe('optimistic route state', () => {
  test('a write reads back before the navigation lands', () => {
    const page = run(() => useRouteState({ key: 'page', parser: parseAsInteger }))

    page.value = 3

    expect(page.value).toBe(3)
    expect(ctx.router.currentRoute.value.query.page).toBeUndefined()
  })

  test('consecutive writes each read back immediately', () => {
    const page = run(() => useRouteState({ key: 'page', parser: parseAsInteger }))

    page.value = 1
    expect(page.value).toBe(1)
    page.value = 2
    expect(page.value).toBe(2)
  })

  test('the value survives until the navigation lands', async () => {
    const page = run(() => useRouteState({ key: 'page', parser: parseAsInteger }))

    page.value = 3
    await flush()

    expect(page.value).toBe(3)
    expect(ctx.router.currentRoute.value.query.page).toBe('3')
  })

  test('a cancelled navigation returns the ref to the URL', async () => {
    const page = run(() => useRouteState({ key: 'page', parser: parseAsInteger }))
    const stop = ctx.router.beforeEach(() => false)

    page.value = 3
    expect(page.value).toBe(3)

    await flush()

    expect(page.value).toBeNull()
    expect(ctx.router.currentRoute.value.query.page).toBeUndefined()
    stop()
  })

  test('an external navigation updates the ref once the write has landed', async () => {
    const page = run(() => useRouteState({ key: 'page', parser: parseAsInteger }))

    page.value = 3
    await flush()
    expect(page.value).toBe(3)

    await ctx.router.push('/?page=9')

    expect(page.value).toBe(9)
  })

  test('an external navigation clears a value left behind by a cancelled write', async () => {
    const page = run(() => useRouteState({ key: 'page', parser: parseAsInteger }))
    const stop = ctx.router.beforeEach(() => false)

    page.value = 3
    await flush()
    stop()

    await ctx.router.push('/?page=9')

    expect(page.value).toBe(9)
  })

  test('toObject reflects a batched set before the navigation lands', () => {
    const states = run(() =>
      useRouteStates([
        { key: 'page', parser: parseAsInteger },
        { key: 'tab', parser: parseAsString },
      ]),
    )

    states.set({ page: 2, tab: 'all' })

    expect(states.toObject()).toEqual({ page: 2, tab: 'all' })
  })

  test('the hash reads back before the navigation lands', () => {
    const hash = run(() => useRouteHash())

    hash.value = '#about'

    expect(hash.value).toBe('#about')
    expect(ctx.router.currentRoute.value.hash).toBe('')
  })
})

describe('mode: source', () => {
  test('a route state reads the URL until the navigation lands', async () => {
    const page = run(() => useRouteState({ key: 'page', parser: parseAsInteger, mode: 'source' }))

    page.value = 3
    expect(page.value).toBeNull()

    await flush()
    expect(page.value).toBe(3)
  })

  test('a hash reads the URL until the navigation lands', async () => {
    const hash = run(() => useRouteHash({ mode: 'source' }))

    hash.value = '#about'
    expect(hash.value).toBeNull()

    await flush()
    expect(hash.value).toBe('#about')
  })

  test('the configured mode applies when a call does not name one', () => {
    ctx.app.use(createMemoryWagen({ router: { mode: 'source' } }))

    run(() => {
      const page = useRouteState({ key: 'page', parser: parseAsInteger })

      page.value = 3
      expect(page.value).toBeNull()
    })
  })

  test('a call overrides the configured mode', () => {
    ctx.app.use(createMemoryWagen({ router: { mode: 'source' } }))

    run(() => {
      const page = useRouteState({ key: 'page', parser: parseAsInteger, mode: 'optimistic' })

      page.value = 3
      expect(page.value).toBe(3)
    })
  })
})

describe('route state reactive parser', () => {
  test('switching the parser reinterprets the value in the URL', async () => {
    await ctx.router.push('/?value=42')

    run(() => {
      const numeric = ref(true)
      const state = useRouteState({
        key: 'value',
        parser: () => (numeric.value ? parseAsInteger : parseAsString),
      })

      expect(state.value).toBe(42)
      numeric.value = false
      expect(state.value).toBe('42')
    })
  })

  test('a value the new parser rejects falls back to its default', async () => {
    await ctx.router.push('/?value=abc')

    run(() => {
      const numeric = ref(false)
      const state = useRouteState({
        key: 'value',
        parser: () => (numeric.value ? parseAsInteger.withDefault(0) : parseAsString),
      })

      expect(state.value).toBe('abc')
      numeric.value = true
      expect(state.value).toBe(0)
    })
  })
})
