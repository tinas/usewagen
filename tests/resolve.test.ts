import { describe, expect, test } from 'vite-plus/test'

import { defineParser, parseAsFloat, parseAsInteger } from '../src/parser'
import { getParser, registerParser, resolveParser } from '../src/parser/resolve'

describe('getParser', () => {
  test('returns built-in parsers by name', () => {
    expect(getParser('parseAsString')!.get('hello')).toBe('hello')
    expect(getParser('parseAsInteger')!.get('42')).toBe(42)
    expect(getParser('parseAsFloat')!.get('3.14')).toBeCloseTo(3.14)
    expect(getParser('parseAsIndex')!.get('1')).toBe(0)
    expect(getParser('parseAsBoolean')!.get('true')).toBe(true)
    expect(getParser('parseAsDate')!.get('2024-01-01')).toBeInstanceOf(Date)
  })

  test('returns undefined for unknown names', () => {
    expect(getParser('parseAsUnknown')).toBeUndefined()
  })
})

describe('registerParser', () => {
  test('registers a custom parser and retrieves it', () => {
    const parseAsHex = defineParser({
      get: v => (/^#[0-9a-f]{6}$/i.test(v) ? v : null),
      set: v => v.toLowerCase(),
    })

    registerParser('parseAsHex', parseAsHex)

    const retrieved = getParser('parseAsHex')!

    expect(retrieved.get('#ff0000')).toBe('#ff0000')
    expect(retrieved.get('invalid')).toBeNull()
    expect(retrieved.set('#FF0000')).toBe('#ff0000')
  })

  test('overwrites an existing parser', () => {
    const custom = defineParser({
      get: v => v.toUpperCase(),
      set: v => v.toLowerCase(),
    })

    registerParser('parseAsString', custom)

    expect(getParser('parseAsString')!.get('hello')).toBe('HELLO')

    // Restore original
    const original = defineParser({ get: v => v, set: String })
    registerParser('parseAsString', original)
  })
})

describe('resolveParser', () => {
  test('passes through a direct ParserWithDefault', () => {
    const parser = parseAsInteger.default(0)
    const resolved = resolveParser(parser)

    expect(resolved).toBe(parser)
  })

  test('passes through a direct Parser (without default)', () => {
    const resolved = resolveParser(parseAsFloat as any)

    expect(resolved.get('3.14')).toBeCloseTo(3.14)
  })

  test('resolves name-based ref without defaultValue', () => {
    const resolved = resolveParser({ name: 'parseAsInteger' })

    expect(resolved.get('42')).toBe(42)
    expect('defaultValue' in resolved).toBe(false)
  })

  test('resolves name-based ref with defaultValue', () => {
    const resolved = resolveParser({ name: 'parseAsInteger', defaultValue: 3 })

    expect(resolved.get('7')).toBe(7)
    expect('defaultValue' in resolved).toBe(true)
    expect((resolved as any).defaultValue).toBe(3)
  })

  test('falls back to parseAsString for unknown name', () => {
    const resolved = resolveParser({ name: 'parseAsNonexistent' })

    expect(resolved.get('anything')).toBe('anything')
  })

  test('falls back to parseAsString with defaultValue for unknown name', () => {
    const resolved = resolveParser({ name: 'parseAsNonexistent', defaultValue: 'fallback' })

    expect((resolved as any).defaultValue).toBe('fallback')
    expect(resolved.get('test')).toBe('test')
  })

  test('resolves name-based ref with explicit undefined defaultValue', () => {
    const resolved = resolveParser({ name: 'parseAsInteger', defaultValue: undefined })

    expect('defaultValue' in resolved).toBe(true)
    expect((resolved as any).defaultValue).toBeUndefined()
  })
})
