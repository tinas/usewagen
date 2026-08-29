import { describe, expect, expectTypeOf, test } from 'vite-plus/test'
import { computed, ref } from 'vue'

import { parseAsInteger } from '../../src/parser/parsers'
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

describe('useRouteStates reactive options', () => {
  test('refs follow a reactive urlKey', async () => {
    await ctx.router.push('/?a_page=4&b_page=9')

    const tenant = ref('a')
    const state = run(() =>
      useRouteStates([
        { key: 'page', urlKey: () => `${tenant.value}_page`, parser: { name: 'parseAsInteger' } },
      ]),
    )

    expect(state.page.value).toBe(4)
    tenant.value = 'b'
    expect(state.page.value).toBe(9)
  })

  test('set writes through the current urlKey in a single navigation', async () => {
    await ctx.router.push('/?a_page=4')

    const tenant = ref('a')
    const state = run(() =>
      useRouteStates([
        { key: 'page', urlKey: () => `${tenant.value}_page`, parser: { name: 'parseAsInteger' } },
        { key: 'q' },
      ]),
    )

    tenant.value = 'b'
    let navigations = 0
    ctx.router.afterEach(() => navigations++)

    state.set({ page: 7, q: 'vue' })
    await flush()

    expect(navigations).toBe(1)
    expect(ctx.router.currentRoute.value.query.b_page).toBe('7')
    expect(ctx.router.currentRoute.value.query.q).toBe('vue')
    expect(ctx.router.currentRoute.value.query.a_page).toBe('4')
  })

  test('reset clears the current urlKey and leaves the previous one', async () => {
    await ctx.router.push('/?a_page=5&b_page=6')

    const tenant = ref('a')
    const state = run(() =>
      useRouteStates([
        {
          key: 'page',
          urlKey: () => `${tenant.value}_page`,
          parser: { name: 'parseAsInteger', defaultValue: 1 },
        },
      ]),
    )

    tenant.value = 'b'
    state.reset()
    await flush()

    expect(ctx.router.currentRoute.value.query.b_page).toBeUndefined()
    expect(ctx.router.currentRoute.value.query.a_page).toBe('5')
  })

  test('toObject re-evaluates inside a computed', async () => {
    await ctx.router.push('/?a_page=1&b_page=2')

    const tenant = ref('a')
    const state = run(() =>
      useRouteStates([
        { key: 'page', urlKey: () => `${tenant.value}_page`, parser: { name: 'parseAsInteger' } },
      ]),
    )
    const snapshot = computed(() => state.toObject())

    expect(snapshot.value).toEqual({ page: 1 })
    tenant.value = 'b'
    expect(snapshot.value).toEqual({ page: 2 })
  })

  test('set honours a reactive history at call time', async () => {
    const history = ref<'push' | 'replace'>('replace')
    const state = run(() =>
      useRouteStates([{ key: 'page', history: () => history.value, parser: PAGE.parser }]),
    )

    state.set({ page: 2 })
    await flush()

    history.value = 'push'
    state.set({ page: 3 })
    await flush()

    ctx.router.back()
    await flush()

    expect(ctx.router.currentRoute.value.query.page).toBe('2')
  })

  test('set honours a reactive source at call time', async () => {
    await ctx.router.push('/item/1')

    const source = ref<'query' | 'params'>('query')
    const state = run(() => useRouteStates([{ key: 'id', source: () => source.value }]))

    state.set({ id: 'q1' })
    await flush()
    expect(ctx.router.currentRoute.value.query.id).toBe('q1')

    source.value = 'params'
    expect(state.id.value).toBe('1')

    state.set({ id: '9' })
    await flush()
    expect(ctx.router.currentRoute.value.params.id).toBe('9')
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

  test('reactive fields keep the literal keys and the parser inference', () => {
    const tenant = ref('a')
    const state = run(() =>
      useRouteStates([
        {
          key: 'page',
          urlKey: () => `${tenant.value}_page`,
          parser: parseAsInteger.withDefault(1),
        },
        { key: 'q', history: ref<'push'>('push') },
      ]),
    )

    expectTypeOf(state.page.value).toEqualTypeOf<number>()
    expectTypeOf(state.q.value).toEqualTypeOf<string | null>()
    expectTypeOf(state.toObject()).toEqualTypeOf<{ page: number; q: string | null }>()
  })

  test('rejects a reactive key, because it names the returned ref', () => {
    function reject() {
      // @ts-expect-error key must stay a literal so the return type can map it
      useRouteStates([{ key: () => 'page' }])
    }

    expect(typeof reject).toBe('function')
  })
})
