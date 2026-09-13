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
    const resolved = toResolvedOptions({ key: 'q', parser: { name: 'parseAsString' } }, DEFAULTS)

    expect(resolved.key).toBe('q')
    expect(resolved.urlKey).toBe('q')
    expect(resolved.source).toBe('query')
    expect(resolved.history).toBe('replace')
    expect(resolved.clearOnDefault).toBe(true)
    expect(resolved.mode).toBe('optimistic')
  })

  test('takes every default from the instance, not from hardcoded values', () => {
    const resolved = toResolvedOptions(
      { key: 'q' },
      { history: 'push', source: 'params', clearOnDefault: false, mode: 'source' },
    )

    expect(resolved.source).toBe('params')
    expect(resolved.history).toBe('push')
    expect(resolved.clearOnDefault).toBe(false)
    expect(resolved.mode).toBe('source')
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
    )

    expect(resolved.urlKey).toBe('page')
  })

  test('parser defaults to parseAsString when omitted', () => {
    const resolved = toResolvedOptions({ key: 'q' }, DEFAULTS)

    expect(resolved.parser.parse('hello')).toBe('hello')
    expect(resolved.parser.defaultValue).toBeUndefined()
  })
})
