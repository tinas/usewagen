import { describe, expect, test, vi } from 'vite-plus/test'

import { getParser, isBuiltinParserName, registerParser } from '../src/registry'
import { defineParser, parseAsFloat, parseAsInteger, parseAsString } from '../src/parser/parsers'
import { resolveParser } from '../src/parser/resolve'

describe('isBuiltinParserName', () => {
  test('is true for every built-in name', () => {
    for (const name of [
      'parseAsString',
      'parseAsInteger',
      'parseAsFloat',
      'parseAsIndex',
      'parseAsBoolean',
      'parseAsDate',
    ]) {
      expect(isBuiltinParserName(name)).toBe(true)
    }
  })

  test('is false for unknown names', () => {
    expect(isBuiltinParserName('parseAsUnknown')).toBe(false)
  })

  test('is false for registered custom parsers', () => {
    registerParser('parseAsCustomFlag', defineParser<string>({ parse: v => v, serialize: String }))

    expect(isBuiltinParserName('parseAsCustomFlag')).toBe(false)
  })
})

describe('getParser', () => {
  test('returns each built-in by name', () => {
    expect(getParser('parseAsString')!.parse('hello')).toBe('hello')
    expect(getParser('parseAsInteger')!.parse('42')).toBe(42)
    expect(getParser('parseAsFloat')!.parse('3.14')).toBeCloseTo(3.14)
    expect(getParser('parseAsIndex')!.parse('1')).toBe(0)
    expect(getParser('parseAsBoolean')!.parse('true')).toBe(true)
    expect(getParser('parseAsDate')!.parse('2024-01-01')).toBeInstanceOf(Date)
  })

  test('returns registered custom parsers', () => {
    const parseAsHex = defineParser<string>({
      parse: v => (/^#[0-9a-f]{6}$/i.test(v) ? v : null),
      serialize: v => v.toLowerCase(),
    })

    registerParser('parseAsHex', parseAsHex)

    expect(getParser('parseAsHex')).toBe(parseAsHex)
  })

  test('returns undefined for unknown names', () => {
    expect(getParser('parseAsMissing')).toBeUndefined()
  })

  test('the built-in wins when a custom name collides with a built-in (registration is ignored)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    registerParser('parseAsInteger', defineParser<number>({ parse: () => 999, serialize: String }))

    expect(getParser('parseAsInteger')!.parse('42')).toBe(42)

    warn.mockRestore()
  })
})

describe('registerParser', () => {
  test('registers a custom parser under the given name', () => {
    const parser = defineParser<string>({ parse: v => v, serialize: String })

    registerParser('parseAsRegistered', parser)

    expect(getParser('parseAsRegistered')).toBe(parser)
  })

  test('overwrites a previously registered custom parser', () => {
    const first = defineParser<string>({ parse: () => 'first', serialize: String })
    const second = defineParser<string>({ parse: () => 'second', serialize: String })

    registerParser('parseAsOverridable', first)
    registerParser('parseAsOverridable', second)

    expect(getParser('parseAsOverridable')!.parse('x')).toBe('second')
  })

  test('warns and does not override a built-in parser', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const custom = defineParser<string>({
      parse: v => v.toUpperCase(),
      serialize: v => v.toLowerCase(),
    })

    registerParser('parseAsString', custom)

    expect(getParser('parseAsString')).toBe(parseAsString)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toContain('parseAsString')

    warn.mockRestore()
  })

  test('accepts names that shadow Object.prototype members', () => {
    const custom = defineParser<string>({ parse: v => `<${v}>`, serialize: String })

    registerParser('toString', custom)

    expect(getParser('toString')!.parse('x')).toBe('<x>')
  })
})

describe('resolveParser', () => {
  test('defaults to parseAsString when input is omitted', () => {
    const resolved = resolveParser()

    expect(resolved.parse('anything')).toBe('anything')
    expect('defaultValue' in resolved).toBe(false)
  })

  test('resolves a direct Parser without a defaultValue', () => {
    const resolved = resolveParser(parseAsFloat)

    expect(resolved.parse('3.14')).toBeCloseTo(3.14)
    expect('defaultValue' in resolved).toBe(false)
  })

  test('preserves defaultValue from a ParserWithDefault', () => {
    const resolved = resolveParser(parseAsInteger.withDefault(0))

    expect(resolved.parse('7')).toBe(7)
    expect(resolved.defaultValue).toBe(0)
  })

  test('resolves a name-based ref without defaultValue', () => {
    const resolved = resolveParser({ name: 'parseAsInteger' })

    expect(resolved.parse('42')).toBe(42)
    expect('defaultValue' in resolved).toBe(false)
  })

  test('resolves a name-based ref with defaultValue', () => {
    const resolved = resolveParser({ name: 'parseAsInteger', defaultValue: 3 })

    expect(resolved.parse('7')).toBe(7)
    expect(resolved.defaultValue).toBe(3)
  })

  test('resolves a name-based ref that points to a registered custom parser', () => {
    registerParser(
      'parseAsShout',
      defineParser<string>({ parse: v => v.toUpperCase(), serialize: v => v.toLowerCase() }),
    )

    const resolved = resolveParser({ name: 'parseAsShout' as any })

    expect(resolved.parse('hi')).toBe('HI')
  })

  test('falls back to parseAsString for an unknown name', () => {
    const resolved = resolveParser({ name: 'parseAsNonexistent' as any })

    expect(resolved.parse('anything')).toBe('anything')
    expect('defaultValue' in resolved).toBe(false)
  })

  test('applies defaultValue on top of the parseAsString fallback', () => {
    const resolved = resolveParser({
      name: 'parseAsNonexistent' as any,
      defaultValue: 'fallback',
    })

    expect(resolved.parse('test')).toBe('test')
    expect(resolved.defaultValue).toBe('fallback')
  })

  test('preserves an explicit undefined defaultValue on a name ref', () => {
    const resolved = resolveParser({ name: 'parseAsInteger', defaultValue: undefined })

    expect('defaultValue' in resolved).toBe(true)
    expect(resolved.defaultValue).toBeUndefined()
  })
})
