import { describe, expect, expectTypeOf, test } from 'vite-plus/test'

import { useRouteStates } from '../../src/router/use-route-states'
import { flush, setupRouter } from '../__helpers__/router'

const ctx = setupRouter()
const { run } = ctx

const PAGE = { key: 'page', parser: { name: 'parseAsInteger', defaultValue: 1 } } as const
const QUERY = { key: 'q', parser: { name: 'parseAsString' } } as const

describe('useRouteStates', () => {
  test('exposes per-key refs', async () => {
    await ctx.router.push('/?page=4&q=vue')
    const state = run(() => useRouteStates([PAGE, QUERY]))

    expect(state.page.value).toBe(4)
    expect(state.q.value).toBe('vue')
  })

  test('individual writes still navigate the URL', async () => {
    const state = run(() => useRouteStates([PAGE, QUERY]))
    state.q.value = 'vue'
    await flush()

    expect(ctx.router.currentRoute.value.query.q).toBe('vue')
  })

  test('set writes several keys in a single navigation', async () => {
    const state = run(() => useRouteStates([PAGE, QUERY]))
    let navigations = 0
    ctx.router.afterEach(() => navigations++)

    state.set({ page: 3, q: 'vue' })
    await flush()

    expect(navigations).toBe(1)
    expect(ctx.router.currentRoute.value.query).toEqual({ page: '3', q: 'vue' })
  })

  test('set with null values clears the keys', async () => {
    await ctx.router.push('/?page=3&q=vue')
    const state = run(() => useRouteStates([PAGE, QUERY]))

    state.set({ page: null, q: null })
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({})
  })

  test('set only affects keys present in the patch', async () => {
    await ctx.router.push('/?page=3&q=vue')
    const state = run(() => useRouteStates([PAGE, QUERY]))

    state.set({ q: 'react' })
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({ page: '3', q: 'react' })
  })

  test('reset restores parser defaults and clears the URL', async () => {
    await ctx.router.push('/?page=8&q=vue')
    const state = run(() => useRouteStates([PAGE, QUERY]))

    state.reset()
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({})
    expect(state.page.value).toBe(1)
    expect(state.q.value).toBeNull()
  })

  test('a batch that changes nothing does not navigate', async () => {
    await ctx.router.push('/?page=4&q=vue')
    const states = run(() => useRouteStates([PAGE, QUERY] as const))
    let navigations = 0
    ctx.router.afterEach(() => navigations++)

    states.set({ page: 4, q: 'vue' }, { history: 'push' })
    await flush()

    expect(navigations).toBe(0)
  })

  test('a batch navigates once for the keys that actually changed', async () => {
    await ctx.router.push('/?page=4&q=vue')
    const states = run(() => useRouteStates([PAGE, QUERY] as const))

    states.set({ page: 4, q: 'nuxt' })
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({ page: '4', q: 'nuxt' })
  })

  test('reset does not navigate when the URL already matches the defaults', async () => {
    const state = run(() => useRouteStates([PAGE, QUERY]))
    let navigations = 0
    ctx.router.afterEach(() => navigations++)

    state.reset()
    await flush()

    expect(navigations).toBe(0)
  })

  test('toObject mirrors the current refs', async () => {
    await ctx.router.push('/?page=2&q=x')
    const state = run(() => useRouteStates([PAGE, QUERY]))

    expect(state.toObject()).toEqual({ page: 2, q: 'x' })
  })

  test('any push in the batch upgrades the navigation to push', async () => {
    const state = run(() => useRouteStates([PAGE, { ...QUERY, history: 'push' }]))

    state.set({ page: 5, q: 'y' })
    await flush()
    ctx.router.back()
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({})
  })

  test('call-site override wins over per-key history', async () => {
    const state = run(() => useRouteStates([PAGE, { ...QUERY, history: 'push' }]))

    state.set({ page: 5, q: 'y' }, { history: 'replace' })
    await flush()
    const after = ctx.router.currentRoute.value.fullPath

    ctx.router.back()
    await flush()

    expect(ctx.router.currentRoute.value.fullPath).toBe(after)
  })
})

describe('useRouteStates type inference', () => {
  test('a key without a parser is typed as string | null', () => {
    const state = run(() => useRouteStates([{ key: 'q' }, PAGE]))

    expectTypeOf(state.q.value).toEqualTypeOf<string | null>()
    expectTypeOf(state.page.value).toEqualTypeOf<number>()
  })
})

describe('useRouteStates option typing', () => {
  test('accepts a readonly config array declared with as const', () => {
    const CONFIGS = [{ key: 'q' }, { key: 'page', parser: { name: 'parseAsInteger' } }] as const
    const state = run(() => useRouteStates(CONFIGS))

    expectTypeOf(state.q.value).toEqualTypeOf<string | null>()
    expectTypeOf(state.page.value).toEqualTypeOf<number | null>()
  })
})
