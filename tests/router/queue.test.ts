import { describe, expect, test } from 'vite-plus/test'
import { nextTick, watch } from 'vue'

import { parseAsInteger, parseAsString } from '../../src/parser/parsers'
import { applyChanges } from '../../src/router/queue'
import { useRouteHash } from '../../src/router/use-route-hash'
import { useRouteState } from '../../src/router/use-route-state'
import { useRouteStates } from '../../src/router/use-route-states'
import { flush, setupRouter } from '../__helpers__/router'

const ctx = setupRouter()
const { run } = ctx

function gate() {
  let release!: () => void
  const opened = new Promise<void>(resolve => {
    release = resolve
  })
  return { opened, release }
}

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

describe('navigation queue while a navigation is in flight', () => {
  test('a write in a later tick carries what the running navigation carried', async () => {
    const guard = gate()
    ctx.router.beforeEach(() => guard.opened)
    const { a, b } = run(() => ({
      a: useRouteState({ key: 'a', parser: parseAsInteger }),
      b: useRouteState({ key: 'b', parser: parseAsInteger }),
    }))

    a.value = 1
    await nextTick()
    b.value = 2
    await nextTick()
    guard.release()
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({ a: '1', b: '2' })
    expect(a.value).toBe(1)
    expect(b.value).toBe(2)
  })

  test('the ref keeps its value until the navigation that finally carries it lands', async () => {
    const guard = gate()
    ctx.router.beforeEach(() => guard.opened)
    const { a, b } = run(() => ({
      a: useRouteState({ key: 'a', parser: parseAsInteger }),
      b: useRouteState({ key: 'b', parser: parseAsInteger }),
    }))
    const seen: (number | null)[] = []
    watch(a, value => seen.push(value), { flush: 'sync' })

    a.value = 1
    await nextTick()
    b.value = 2
    await nextTick()
    guard.release()
    await flush()

    expect(seen).toEqual([1])
  })

  test('a push cancelled by a later write is still pushed', async () => {
    const guard = gate()
    ctx.router.beforeEach(() => guard.opened)
    const { a, b } = run(() => ({
      a: useRouteState({ key: 'a', history: 'push' }),
      b: useRouteState({ key: 'b', history: 'replace' }),
    }))

    a.value = 'one'
    await nextTick()
    b.value = 'two'
    await nextTick()
    guard.release()
    await flush()
    expect(ctx.router.currentRoute.value.query).toEqual({ a: 'one', b: 'two' })

    ctx.router.back()
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({})
  })

  test('a write that repeats what is in flight joins it instead of navigating again', async () => {
    const guard = gate()
    ctx.router.beforeEach(() => guard.opened)
    const a = run(() => useRouteState({ key: 'a', parser: parseAsInteger }))
    let navigations = 0
    ctx.router.afterEach((_to, _from, failure) => {
      if (!failure) navigations++
    })

    a.value = 1
    await nextTick()
    a.value = 1
    await nextTick()
    guard.release()
    await flush()

    expect(navigations).toBe(1)
    expect(ctx.router.currentRoute.value.query).toEqual({ a: '1' })
  })

  test('a navigation a guard refused does not leak into later writes', async () => {
    ctx.router.beforeEach(to => to.query.a !== '1')
    const { a, b } = run(() => ({
      a: useRouteState({ key: 'a', parser: parseAsInteger }),
      b: useRouteState({ key: 'b', parser: parseAsInteger }),
    }))

    a.value = 1
    await flush()
    expect(ctx.router.currentRoute.value.query).toEqual({})
    expect(a.value).toBeNull()

    b.value = 2
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({ b: '2' })
  })

  test('a navigation that landed in between is the base for the next write', async () => {
    const { a, b } = run(() => ({
      a: useRouteState({ key: 'a', parser: parseAsInteger }),
      b: useRouteState({ key: 'b', parser: parseAsInteger }),
    }))

    a.value = 1
    await flush()
    await ctx.router.push('/?a=5')
    b.value = 2
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({ a: '5', b: '2' })
  })
})

describe('applyChanges', () => {
  const base = { params: {}, query: { a: '1', empty: null, list: ['x', 'y'] }, hash: '' }

  test('writes a query value and reports the change', () => {
    const { target, changed } = applyChanges(
      base,
      [{ urlKey: 'b', source: 'query', serialized: '2' }],
      undefined,
    )

    expect(changed).toBe(true)
    expect(target.query).toEqual({ a: '1', empty: null, list: ['x', 'y'], b: '2' })
    expect(base.query).toEqual({ a: '1', empty: null, list: ['x', 'y'] })
  })

  test('writing the value already there is not a change', () => {
    const { changed } = applyChanges(
      base,
      [{ urlKey: 'a', source: 'query', serialized: '1' }],
      undefined,
    )

    expect(changed).toBe(false)
  })

  test('removing a key that is not there is not a change', () => {
    const { target, changed } = applyChanges(
      base,
      [{ urlKey: 'missing', source: 'query', serialized: null }],
      undefined,
    )

    expect(changed).toBe(false)
    expect(target.query.missing).toBeUndefined()
  })

  test('removing a key present without a value is a change', () => {
    const { target, changed } = applyChanges(
      base,
      [{ urlKey: 'empty', source: 'query', serialized: null }],
      undefined,
    )

    expect(changed).toBe(true)
    expect(target.query.empty).toBeUndefined()
  })

  test('a repeated key is always replaced', () => {
    const { target, changed } = applyChanges(
      base,
      [{ urlKey: 'list', source: 'query', serialized: 'x' }],
      undefined,
    )

    expect(changed).toBe(true)
    expect(target.query.list).toBe('x')
  })

  test('params and query are written apart', () => {
    const { target } = applyChanges(
      { params: { id: '1' }, query: {}, hash: '' },
      [
        { urlKey: 'id', source: 'params', serialized: '2' },
        { urlKey: 'id', source: 'query', serialized: '3' },
      ],
      undefined,
    )

    expect(target.params).toEqual({ id: '2' })
    expect(target.query).toEqual({ id: '3' })
  })

  test('the last write to a key wins', () => {
    const { target } = applyChanges(
      base,
      [
        { urlKey: 'a', source: 'query', serialized: '2' },
        { urlKey: 'a', source: 'query', serialized: '3' },
      ],
      undefined,
    )

    expect(target.query.a).toBe('3')
  })

  test('an undefined hash keeps the one in the base', () => {
    const { target, changed } = applyChanges({ ...base, hash: '#top' }, [], undefined)

    expect(changed).toBe(false)
    expect(target.hash).toBe('#top')
  })

  test('a null hash clears it', () => {
    const { target, changed } = applyChanges({ ...base, hash: '#top' }, [], null)

    expect(changed).toBe(true)
    expect(target.hash).toBe('')
  })

  test('writing the hash already there is not a change', () => {
    const { changed } = applyChanges({ ...base, hash: '#top' }, [], '#top')

    expect(changed).toBe(false)
  })
})
