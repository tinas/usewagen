import { describe, expect, test } from 'vite-plus/test'

import { toResolvedOptions } from '../../src/router/utils'

describe('toResolvedOptions', () => {
  test('applies defaults for optional fields', () => {
    const resolved = toResolvedOptions({ key: 'q', parser: { name: 'parseAsString' } })

    expect(resolved.key).toBe('q')
    expect(resolved.urlKey).toBe('q')
    expect(resolved.source).toBe('query')
    expect(resolved.history).toBe('replace')
    expect(resolved.clearOnDefault).toBe(true)
  })

  test('preserves explicit values', () => {
    const resolved = toResolvedOptions({
      key: 'search',
      parser: { name: 'parseAsString' },
      urlKey: 'q',
      source: 'params',
      history: 'push',
      clearOnDefault: false,
    })

    expect(resolved.urlKey).toBe('q')
    expect(resolved.source).toBe('params')
    expect(resolved.history).toBe('push')
    expect(resolved.clearOnDefault).toBe(false)
  })

  test('urlKey defaults to key', () => {
    const resolved = toResolvedOptions({ key: 'page', parser: { name: 'parseAsInteger' } })

    expect(resolved.urlKey).toBe('page')
  })

  test('parser defaults to parseAsString when omitted', () => {
    const resolved = toResolvedOptions({ key: 'q' })

    expect(resolved.parser.parse('hello')).toBe('hello')
    expect('defaultValue' in resolved.parser).toBe(false)
  })
})
