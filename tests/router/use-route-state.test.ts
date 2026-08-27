import { describe, expect, expectTypeOf, test } from 'vite-plus/test'
import { computed } from 'vue'

import { parseAsInteger } from '../../src/parser/parsers'
import { useRouteState } from '../../src/router/use-route-state'
import { flush, setupRouter } from '../__helpers__/router'

const ctx = setupRouter()
const { run } = ctx

const PAGE = { key: 'page', parser: { name: 'parseAsInteger', defaultValue: 1 } } as const
const QUERY = { key: 'q', parser: { name: 'parseAsString' } } as const

describe('useRouteState', () => {
  test('reads the value from the query string', async () => {
    await ctx.router.push('/?page=4&q=vue')

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

    expect(ctx.router.currentRoute.value.query.q).toBe('headphones')
  })

  test('null clears the key and falls back to the default', async () => {
    await ctx.router.push('/?page=7')

    const page = run(() => useRouteState(PAGE))
    expect(page.value).toBe(7)

    page.value = null
    await flush()

    expect(ctx.router.currentRoute.value.query.page).toBeUndefined()
    expect(page.value).toBe(1)
  })

  test('clearOnDefault drops a value equal to the default', async () => {
    const page = run(() => useRouteState(PAGE))
    page.value = 1
    await flush()

    expect(ctx.router.currentRoute.value.query.page).toBeUndefined()
  })

  test('clearOnDefault=false keeps a value equal to the default in the URL', async () => {
    const page = run(() => useRouteState({ ...PAGE, clearOnDefault: false }))
    page.value = 1
    await flush()

    expect(ctx.router.currentRoute.value.query.page).toBe('1')
  })

  test('history:replace does not add a history entry', async () => {
    const q = run(() => useRouteState(QUERY))
    q.value = 'x'
    await flush()
    const afterWrite = ctx.router.currentRoute.value.fullPath

    ctx.router.back()
    await flush()

    expect(ctx.router.currentRoute.value.fullPath).toBe(afterWrite)
  })

  test('history:push adds a history entry', async () => {
    const q = run(() => useRouteState({ ...QUERY, history: 'push' }))
    q.value = 'x'
    await flush()

    ctx.router.back()
    await flush()

    expect(ctx.router.currentRoute.value.query.q).toBeUndefined()
  })

  test('writing the value already in the URL does not navigate', async () => {
    await ctx.router.push('/?q=x')
    const q = run(() => useRouteState({ ...QUERY, history: 'push' }))
    let navigations = 0
    ctx.router.afterEach(() => navigations++)

    q.value = 'x'
    await flush()

    expect(navigations).toBe(0)
  })

  test('clearing an already absent key does not navigate', async () => {
    const q = run(() => useRouteState({ ...QUERY, history: 'push' }))
    let navigations = 0
    ctx.router.afterEach(() => navigations++)

    q.value = null
    await flush()

    expect(navigations).toBe(0)
  })

  test('writing the param already in the URL does not navigate', async () => {
    await ctx.router.push('/item/1')
    const id = run(() =>
      useRouteState({ key: 'id', parser: { name: 'parseAsInteger' }, source: 'params' }),
    )
    let navigations = 0
    ctx.router.afterEach(() => navigations++)

    id.value = 1
    await flush()

    expect(navigations).toBe(0)
  })

  test('a repeated query key collapses even when writing the value already read', async () => {
    await ctx.router.push('/?q=a&q=b')
    const q = run(() => useRouteState(QUERY))
    let navigations = 0
    ctx.router.afterEach(() => navigations++)
    expect(q.value).toBe('a')

    q.value = 'a'
    await flush()

    expect(navigations).toBe(1)
    expect(ctx.router.currentRoute.value.query.q).toBe('a')
  })

  test('source:params reads from and writes to route.params', async () => {
    await ctx.router.push('/item/1')
    const id = run(() =>
      useRouteState({ key: 'id', parser: { name: 'parseAsInteger' }, source: 'params' }),
    )

    expect(id.value).toBe(1)

    id.value = 9
    await flush()

    expect(ctx.router.currentRoute.value.params.id).toBe('9')
    expect(ctx.router.currentRoute.value.query.id).toBeUndefined()
  })
})

describe('useRouteState type inference', () => {
  test('falls back to the default parser when none is given', async () => {
    await ctx.router.push('/?q=vue')
    const q = run(() => useRouteState({ key: 'q' }))

    expectTypeOf(q.value).toEqualTypeOf<string | null>()
    expect(q.value).toBe('vue')
  })

  test('a parser instance without a default infers value | null', () => {
    const page = run(() => useRouteState({ key: 'page', parser: parseAsInteger }))

    expectTypeOf(page.value).toEqualTypeOf<number | null>()
  })

  test('a parser instance with a default infers the value', () => {
    const page = run(() => useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) }))

    expectTypeOf(page.value).toEqualTypeOf<number>()
  })

  test('a named parser ref infers through the registry', () => {
    const page = run(() => useRouteState({ key: 'page', parser: { name: 'parseAsInteger' } }))

    expectTypeOf(page.value).toEqualTypeOf<number | null>()
  })
})

describe('useRouteState option typing', () => {
  test('reads the parser through a getter and a ref', async () => {
    await ctx.router.push('/?page=7')

    const fromGetter = run(() => useRouteState(() => ({ key: 'q' })))
    const fromRef = run(() =>
      useRouteState(computed(() => ({ key: 'page', parser: parseAsInteger }))),
    )

    expectTypeOf(fromGetter.value).toEqualTypeOf<string | null>()
    expectTypeOf(fromRef.value).toEqualTypeOf<number | null>()
    expect(fromRef.value).toBe(7)
  })

  test('reads the parser through a plain variable', () => {
    const options = { key: 'page', parser: parseAsInteger.withDefault(1) }
    const page = run(() => useRouteState(options))

    expectTypeOf(page.value).toEqualTypeOf<number>()
  })

  test('rejects a misspelled or missing option', () => {
    function reject() {
      // @ts-expect-error unknown option
      useRouteState({ key: 'q', urlkey: 'q' })
      // @ts-expect-error wrong option type
      useRouteState({ key: 'q', source: 'nope' })
      // @ts-expect-error key is required
      useRouteState({ parser: parseAsInteger })
    }

    expect(typeof reject).toBe('function')
  })
})
