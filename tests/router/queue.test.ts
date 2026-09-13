import { describe, expect, test } from 'vite-plus/test'

import { parseAsInteger, parseAsString } from '../../src/parser/parsers'
import { useRouteHash } from '../../src/router/use-route-hash'
import { useRouteState } from '../../src/router/use-route-state'
import { useRouteStates } from '../../src/router/use-route-states'
import { flush, setupRouter } from '../__helpers__/router'

const ctx = setupRouter()
const { run } = ctx

describe('navigation queue', () => {
  test('two independent refs written in the same tick land in one URL', async () => {
    const { a, b } = run(() => ({
      a: useRouteState({ key: 'a', parser: parseAsInteger }),
      b: useRouteState({ key: 'b', parser: parseAsInteger }),
    }))
    let navigations = 0
    ctx.router.afterEach(() => navigations++)

    a.value = 1
    b.value = 2
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({ a: '1', b: '2' })
    expect(navigations).toBe(1)
  })

  test('a query and a hash written in the same tick collapse into one navigation', async () => {
    const { q, hash } = run(() => ({
      q: useRouteState({ key: 'q' }),
      hash: useRouteHash(),
    }))
    let navigations = 0
    ctx.router.afterEach(() => navigations++)

    q.value = 'x'
    hash.value = '#section'
    await flush()

    expect(ctx.router.currentRoute.value.fullPath).toBe('/?q=x#section')
    expect(navigations).toBe(1)
  })

  test('push wins when one of the batched writes asks for it', async () => {
    const { a, b } = run(() => ({
      a: useRouteState({ key: 'a', history: 'replace' }),
      b: useRouteState({ key: 'b', history: 'push' }),
    }))

    a.value = 'one'
    b.value = 'two'
    await flush()
    expect(ctx.router.currentRoute.value.query).toEqual({ a: 'one', b: 'two' })

    ctx.router.back()
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({})
  })

  test('writes in separate ticks navigate separately', async () => {
    const { a, b } = run(() => ({
      a: useRouteState({ key: 'a' }),
      b: useRouteState({ key: 'b' }),
    }))
    let navigations = 0
    ctx.router.afterEach(() => navigations++)

    a.value = 'one'
    await flush()
    b.value = 'two'
    await flush()

    expect(navigations).toBe(2)
    expect(ctx.router.currentRoute.value.query).toEqual({ a: 'one', b: 'two' })
  })

  test('a batched set writes every key in one navigation', async () => {
    const states = run(() =>
      useRouteStates([
        { key: 'page', parser: parseAsInteger },
        { key: 'tab', parser: parseAsString },
      ]),
    )
    let navigations = 0
    ctx.router.afterEach(() => navigations++)

    states.set({ page: 2, tab: 'all' })
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({ page: '2', tab: 'all' })
    expect(navigations).toBe(1)
  })

  test('a batched reset clears every key in one navigation', async () => {
    await ctx.router.push('/?page=4&tab=open')
    const states = run(() =>
      useRouteStates([
        { key: 'page', parser: parseAsInteger },
        { key: 'tab', parser: parseAsString },
      ]),
    )
    let navigations = 0
    ctx.router.afterEach(() => navigations++)

    states.reset()
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({})
    expect(navigations).toBe(1)
  })

  test('a batch mixing a ref write and the batch API still navigates once', async () => {
    const states = run(() =>
      useRouteStates([
        { key: 'page', parser: parseAsInteger },
        { key: 'tab', parser: parseAsString },
      ]),
    )
    const extra = run(() => useRouteState({ key: 'extra' }))
    let navigations = 0
    ctx.router.afterEach(() => navigations++)

    states.set({ page: 2 })
    extra.value = 'yes'
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({ page: '2', extra: 'yes' })
    expect(navigations).toBe(1)
  })
})
