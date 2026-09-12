import { describe, expect, expectTypeOf, test } from 'vite-plus/test'
import { ref } from 'vue'

import { parseAsInteger, parseAsString } from '../../src/parser/parsers'
import { routeHashOptions, routeStateOptions } from '../../src/router/options'
import { useRouteHash } from '../../src/router/use-route-hash'
import { useRouteState } from '../../src/router/use-route-state'
import { useRouteStates } from '../../src/router/use-route-states'
import { flush, setupRouter } from '../__helpers__/router'

const ctx = setupRouter()
const { run } = ctx

const pageOptions = routeStateOptions({ key: 'page', parser: parseAsInteger.withDefault(1) })
const tabOptions = routeStateOptions({ key: 'tab', parser: parseAsString })

function sectionOptions(section: string) {
  return routeStateOptions({ key: `${section}-page`, parser: parseAsInteger.withDefault(1) })
}

describe('routeStateOptions', () => {
  test('returns the options it is given', () => {
    const options = { key: 'page', parser: parseAsInteger }

    expect(routeStateOptions(options)).toBe(options)
  })

  test('one definition drives useRouteState', async () => {
    const page = run(() => useRouteState(pageOptions))

    expect(page.value).toBe(1)
    page.value = 4
    await flush()

    expect(ctx.router.currentRoute.value.query.page).toBe('4')
  })

  test('the same definition drives useRouteStates', async () => {
    const states = run(() => useRouteStates([pageOptions, tabOptions]))

    states.set({ page: 2, tab: 'all' })
    await flush()

    expect(ctx.router.currentRoute.value.query).toEqual({ page: '2', tab: 'all' })
  })

  test('two refs over one definition stay in sync', async () => {
    const a = run(() => useRouteState(pageOptions))
    const b = run(() => useRouteState(pageOptions))

    a.value = 5
    await flush()

    expect(b.value).toBe(5)
  })

  test('a getter definition keeps reacting', async () => {
    await ctx.router.push('/?a-page=2&b-page=7')

    run(() => {
      const section = ref('a')
      const page = useRouteState(
        routeStateOptions(() => ({
          key: `${section.value}-page`,
          parser: parseAsInteger.withDefault(1),
        })),
      )

      expect(page.value).toBe(2)
      section.value = 'b'
      expect(page.value).toBe(7)
    })
  })

  test('a parameterized factory produces independent definitions', async () => {
    await ctx.router.push('/?left-page=3&right-page=8')

    const { left, right } = run(() => ({
      left: useRouteState(sectionOptions('left')),
      right: useRouteState(sectionOptions('right')),
    }))

    expect(left.value).toBe(3)
    expect(right.value).toBe(8)
  })
})

describe('routeHashOptions', () => {
  test('one definition drives useRouteHash', async () => {
    const options = routeHashOptions({ parser: { name: 'parseAsString', defaultValue: '#home' } })
    const hash = run(() => useRouteHash(options))

    expect(hash.value).toBe('#home')
    hash.value = '#about'
    await flush()

    expect(ctx.router.currentRoute.value.hash).toBe('#about')
  })
})

describe('routeStateOptions typing', () => {
  test('a definition carries its parser through every composable', () => {
    const page = run(() => useRouteState(pageOptions))
    const states = run(() => useRouteStates([pageOptions, tabOptions]))

    expectTypeOf(page.value).toEqualTypeOf<number>()
    expectTypeOf(states.page.value).toEqualTypeOf<number>()
    expectTypeOf(states.tab.value).toEqualTypeOf<string | null>()
  })

  test('a definition without a parser falls back to the default parser', () => {
    const bare = routeStateOptions({ key: 'bare' })
    const state = run(() => useRouteState(bare))

    expectTypeOf(state.value).toEqualTypeOf<string | null>()
  })

  test('rejects a misspelled option and a mistyped patch', () => {
    function reject() {
      // @ts-expect-error unknown option
      routeStateOptions({ key: 'k', historyy: 'push' })
      const states = useRouteStates([pageOptions])
      // @ts-expect-error page is a number
      states.set({ page: 'nope' })
    }

    expect(typeof reject).toBe('function')
  })
})
