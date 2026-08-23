import { describe, expect, test } from 'vite-plus/test'

import { resolveParser } from '../src/parser/resolve'
import { parseValue, serializeValue, toResolvedOptions } from '../src/router/utils'

describe('parseValue', () => {
  const intWithDefault = resolveParser({ name: 'parseAsInteger', defaultValue: 1 })
  const strWithDefault = resolveParser({ name: 'parseAsString', defaultValue: '12' })
  const strNoDefault = resolveParser({ name: 'parseAsString' })

  test('falls back to the default when the key is missing', () => {
    expect(parseValue(intWithDefault, undefined)).toBe(1)
    expect(parseValue(strWithDefault, undefined)).toBe('12')
    expect(parseValue(strNoDefault, undefined)).toBeNull()
  })

  test('treats a null value (?flag without a value) as missing', () => {
    expect(parseValue(strWithDefault, null)).toBe('12')
    expect(parseValue(strNoDefault, null)).toBeNull()
  })

  test('takes the first entry when the key repeats', () => {
    expect(parseValue(intWithDefault, ['7', '9'])).toBe(7)
  })

  test('skips leading null entries and takes the first present value', () => {
    expect(parseValue(strNoDefault, [null, 'foo', 'bar'])).toBe('foo')
    expect(parseValue(intWithDefault, [null, null, '5'])).toBe(5)
  })

  test('falls back to the default when every array entry is null', () => {
    expect(parseValue(strWithDefault, [null, null])).toBe('12')
  })

  test('falls back to the default for an empty array', () => {
    expect(parseValue(strWithDefault, [])).toBe('12')
  })

  test('present values still win over the default', () => {
    expect(parseValue(intWithDefault, '42')).toBe(42)
    expect(parseValue(strWithDefault, '')).toBe('')
  })

  test('falls back to the default when parsing yields null', () => {
    expect(parseValue(intWithDefault, 'abc')).toBe(1)
  })
})

describe('serializeValue', () => {
  const intWithDefault = resolveParser({ name: 'parseAsInteger', defaultValue: 1 })
  const strWithDefault = resolveParser({ name: 'parseAsString', defaultValue: '12' })
  const intNoDefault = resolveParser({ name: 'parseAsInteger' })

  test('null and undefined clear the key', () => {
    expect(serializeValue(intWithDefault, false, null)).toBeNull()
    expect(serializeValue(intWithDefault, false, undefined)).toBeNull()
    expect(serializeValue(strWithDefault, false, null)).toBeNull()
  })

  test('plain values serialize to strings', () => {
    expect(serializeValue(intWithDefault, false, 5)).toBe('5')
    expect(serializeValue(strWithDefault, false, 'hi')).toBe('hi')
  })

  test('clearOnDefault clears when the value equals the default', () => {
    expect(serializeValue(intWithDefault, true, 1)).toBeNull()
    expect(serializeValue(intWithDefault, true, 2)).toBe('2')
  })

  test('clearOnDefault has no effect when the parser has no default', () => {
    expect(serializeValue(intNoDefault, true, 5)).toBe('5')
  })
})

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
