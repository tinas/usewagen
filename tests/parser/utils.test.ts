import type { ParserInput } from '../../src/parser/types'

import { describe, expect, test } from 'vite-plus/test'

import { resolveParser } from '../../src/parser/resolve'
import { parseValue, serializeValue } from '../../src/parser/utils'

function state(input: ParserInput | undefined, missing: unknown, clearOnDefault = false) {
  return { parser: resolveParser(input), clearOnDefault, missing }
}

describe('parseValue', () => {
  const intWithDefault = state({ name: 'parseAsInteger', defaultValue: 1 }, null)
  const strWithDefault = state({ name: 'parseAsString', defaultValue: '12' }, null)
  const strNoDefault = state({ name: 'parseAsString' }, null)

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
  const intWithDefault = state({ name: 'parseAsInteger', defaultValue: 1 }, null)
  const strWithDefault = state({ name: 'parseAsString', defaultValue: '12' }, null)
  const intNoDefault = state({ name: 'parseAsInteger' }, null)

  test('null and undefined clear the key', () => {
    expect(serializeValue(intWithDefault, null)).toBeNull()
    expect(serializeValue(intWithDefault, undefined)).toBeNull()
    expect(serializeValue(strWithDefault, null)).toBeNull()
  })

  test('plain values serialize to strings', () => {
    expect(serializeValue(intWithDefault, 5)).toBe('5')
    expect(serializeValue(strWithDefault, 'hi')).toBe('hi')
  })

  test('clearOnDefault clears when the value equals the default', () => {
    const clearing = { ...intWithDefault, clearOnDefault: true }

    expect(serializeValue(clearing, 1)).toBeNull()
    expect(serializeValue(clearing, 2)).toBe('2')
  })

  test('clearOnDefault has no effect when the parser has no default', () => {
    expect(serializeValue({ ...intNoDefault, clearOnDefault: true }, 5)).toBe('5')
  })
})

describe('the missing value', () => {
  const intWithDefault = state({ name: 'parseAsInteger', defaultValue: 1 }, undefined)
  const intNoDefault = state({ name: 'parseAsInteger' }, undefined)
  const intNaN = state({ name: 'parseAsInteger' }, Number.NaN)

  test('a missing value reads as the missing value when the parser has no default', () => {
    expect(parseValue(intNoDefault, undefined)).toBeUndefined()
    expect(parseValue(intNoDefault, null)).toBeUndefined()
    expect(parseValue(intNoDefault, [])).toBeUndefined()
  })

  test('a rejected string reads as the missing value when the parser has no default', () => {
    expect(parseValue(intNoDefault, 'abc')).toBeUndefined()
  })

  test('the default still wins over the missing value', () => {
    expect(parseValue(intWithDefault, undefined)).toBe(1)
    expect(parseValue(intWithDefault, 'abc')).toBe(1)
  })

  test('writing the missing value clears the key', () => {
    expect(serializeValue(intNoDefault, undefined)).toBeNull()
    expect(serializeValue(intNaN, Number.NaN)).toBeNull()
  })

  test('null and undefined clear the key whatever the missing value is', () => {
    expect(serializeValue(intNaN, null)).toBeNull()
    expect(serializeValue(intNaN, undefined)).toBeNull()
  })

  test('a value that is not the missing value is written as usual', () => {
    expect(serializeValue(intNaN, 0)).toBe('0')
    expect(serializeValue(intNoDefault, 5)).toBe('5')
  })
})
