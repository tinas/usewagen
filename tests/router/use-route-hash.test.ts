import { describe, expect, expectTypeOf, test } from 'vite-plus/test'

import { defineParser } from '../../src/parser/parsers'
import { useRouteHash } from '../../src/router/use-route-hash'
import { flush, setupRouter } from '../__helpers__/router'

const ctx = setupRouter()
const { run } = ctx

describe('useRouteHash', () => {
  test('reads the hash verbatim including the # prefix', async () => {
    await ctx.router.push('/#section')

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

    expect(ctx.router.currentRoute.value.hash).toBe('#about')
  })

  test('round-trips a value written with a # prefix', async () => {
    const hash = run(() => useRouteHash())
    hash.value = '#about'
    await flush()

    expect(hash.value).toBe('#about')
  })

  test('null clears the hash and falls back to the default', async () => {
    await ctx.router.push('/#existing')

    const hash = run(() =>
      useRouteHash({ parser: { name: 'parseAsString', defaultValue: '#home' } }),
    )
    hash.value = null
    await flush()

    expect(ctx.router.currentRoute.value.hash).toBe('')
    expect(hash.value).toBe('#home')
  })

  test('clearOnDefault drops a value equal to the default', async () => {
    const hash = run(() =>
      useRouteHash({ parser: { name: 'parseAsString', defaultValue: '#home' } }),
    )
    hash.value = '#home'
    await flush()

    expect(ctx.router.currentRoute.value.hash).toBe('')
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

    expect(ctx.router.currentRoute.value.hash).toBe('#home')
  })

  test('supports a custom parser that owns the # prefix', async () => {
    const parseAsHashInteger = defineParser<number>({
      parse: v => {
        const n = Number.parseInt(v.replace(/^#/, ''), 10)
        return Number.isNaN(n) ? null : n
      },
      serialize: v => `#${v}`,
    })

    await ctx.router.push('/#42')

    const hash = run(() => useRouteHash({ parser: parseAsHashInteger }))
    expect(hash.value).toBe(42)

    hash.value = 7
    await flush()
    expect(ctx.router.currentRoute.value.hash).toBe('#7')
  })

  test('writing the hash already in the URL does not navigate', async () => {
    await ctx.router.push('/#section')
    const hash = run(() => useRouteHash({ history: 'push' }))

    hash.value = '#section'
    await flush()

    ctx.router.back()
    await flush()

    expect(ctx.router.currentRoute.value.fullPath).toBe('/')
  })

  test('history:replace does not add a history entry', async () => {
    const hash = run(() => useRouteHash())
    hash.value = '#a'
    await flush()
    const after = ctx.router.currentRoute.value.fullPath

    ctx.router.back()
    await flush()

    expect(ctx.router.currentRoute.value.fullPath).toBe(after)
  })

  test('history:push adds a history entry', async () => {
    const hash = run(() => useRouteHash({ history: 'push' }))
    hash.value = '#a'
    await flush()

    ctx.router.back()
    await flush()

    expect(ctx.router.currentRoute.value.hash).toBe('')
  })

  test('preserves query and params on navigation', async () => {
    await ctx.router.push('/?page=2')
    const hash = run(() => useRouteHash())

    hash.value = '#section'
    await flush()

    expect(ctx.router.currentRoute.value.query.page).toBe('2')
    expect(ctx.router.currentRoute.value.hash).toBe('#section')
  })
})

describe('useRouteHash type inference', () => {
  test('falls back to the default parser when no options are given', () => {
    const hash = run(() => useRouteHash())

    expectTypeOf(hash.value).toEqualTypeOf<string | null>()
  })

  test('falls back to the default parser when only other options are given', () => {
    const hash = run(() => useRouteHash({ history: 'push' }))

    expectTypeOf(hash.value).toEqualTypeOf<string | null>()
  })
})

describe('useRouteHash option typing', () => {
  test('rejects a misspelled option', () => {
    function reject() {
      // @ts-expect-error unknown option
      useRouteHash({ historyy: 'push' })
    }

    expect(typeof reject).toBe('function')
  })
})
