import type { ResolvedWagenRouterOptions } from '../../src/wagen'

import { describe, expect, test } from 'vite-plus/test'

import { toResolvedOptions } from '../../src/router/utils'

const DEFAULTS: ResolvedWagenRouterOptions = {
  history: 'replace',
  source: 'query',
  clearOnDefault: true,
  mode: 'optimistic',
}

describe('toResolvedOptions', () => {
  test('applies the given defaults for optional fields', () => {
    const resolved = toResolvedOptions(
      { key: 'q', parser: { name: 'parseAsString' } },
      DEFAULTS,
      null,
    )

    expect(resolved.key).toBe('q')
    expect(resolved.urlKey).toBe('q')
    expect(resolved.source).toBe('query')
    expect(resolved.history).toBe('replace')
    expect(resolved.clearOnDefault).toBe(true)
    expect(resolved.mode).toBe('optimistic')
  })

  test('takes every default from the arguments, not from hardcoded values', () => {
    const resolved = toResolvedOptions(
      { key: 'q' },
      { history: 'push', source: 'params', clearOnDefault: false, mode: 'source' },
      undefined,
    )

    expect(resolved.source).toBe('params')
    expect(resolved.history).toBe('push')
    expect(resolved.clearOnDefault).toBe(false)
    expect(resolved.mode).toBe('source')
    expect(resolved.missing).toBeUndefined()
  })

  test('preserves explicit values over the defaults', () => {
    const resolved = toResolvedOptions(
      {
        key: 'search',
        parser: { name: 'parseAsString' },
        urlKey: 'q',
        source: 'params',
        history: 'push',
        clearOnDefault: false,
      },
      DEFAULTS,
      null,
    )

    expect(resolved.urlKey).toBe('q')
    expect(resolved.source).toBe('params')
    expect(resolved.history).toBe('push')
    expect(resolved.clearOnDefault).toBe(false)
  })

  test('urlKey defaults to key', () => {
    const resolved = toResolvedOptions(
      { key: 'page', parser: { name: 'parseAsInteger' } },
      DEFAULTS,
      null,
    )

    expect(resolved.urlKey).toBe('page')
  })

  test('parser defaults to parseAsString when omitted', () => {
    const resolved = toResolvedOptions({ key: 'q' }, DEFAULTS, null)

    expect(resolved.parser.parse('hello')).toBe('hello')
    expect(resolved.parser.defaultValue).toBeUndefined()
  })

  test('the missing value is the one given', () => {
    expect(toResolvedOptions({ key: 'q' }, DEFAULTS, null).missing).toBeNull()
    expect(toResolvedOptions({ key: 'q' }, DEFAULTS, undefined).missing).toBeUndefined()
  })

  test('an explicit missing value wins over the given one, even when it is undefined', () => {
    const resolved = toResolvedOptions({ key: 'q', missing: undefined }, DEFAULTS, null)

    expect(resolved.missing).toBeUndefined()
    expect(toResolvedOptions({ key: 'q', missing: 0 }, DEFAULTS, null).missing).toBe(0)
  })
})
