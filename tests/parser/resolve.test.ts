import { afterEach, describe, expect, test, vi } from 'vite-plus/test'

import { defineParser, parseAsFloat, parseAsInteger, parseAsString } from '../../src/parser/parsers'
import { getParser, isBuiltinParserName, resolveParser } from '../../src/parser/resolve'
import { ErrorCodes, getMessage } from '../../src/messages'
import { installWagen, resetWagen } from '../__helpers__/wagen'

const parseAsShout = defineParser<string>({
  parse: v => v.toUpperCase(),
  serialize: v => v.toLowerCase(),
})

afterEach(() => {
  resetWagen()
  vi.restoreAllMocks()
})

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

  test('is false for a configured custom parser', () => {
    installWagen({ parsers: { parseAsShout } })

    expect(isBuiltinParserName('parseAsShout')).toBe(false)
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

  test('returns the parser configured on the active instance', () => {
    installWagen({ parsers: { parseAsShout } })

    expect(getParser('parseAsShout')).toBe(parseAsShout)
  })

  test('returns undefined for unknown names', () => {
    expect(getParser('parseAsMissing')).toBeUndefined()
  })

  test('a built-in name cannot be shadowed by the config', () => {
    const fake = defineParser<number>({ parse: () => 999, serialize: String })
    installWagen({ parsers: { parseAsInteger: fake } })

    expect(getParser('parseAsInteger')!.parse('42')).toBe(42)
  })

  test('names that shadow Object.prototype members do not leak through', () => {
    installWagen()

    expect(getParser('toString')).toBeUndefined()
  })

  test('a name configured as an own property still resolves', () => {
    installWagen({ parsers: { toString: parseAsShout } })

    expect(getParser('toString')).toBe(parseAsShout)
  })
})

describe('resolveParser', () => {
  test('defaults to parseAsString when input is omitted', () => {
    const resolved = resolveParser()

    expect(resolved.parse('anything')).toBe('anything')
    expect(resolved.defaultValue).toBeUndefined()
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
    expect(resolved.defaultValue).toBeUndefined()
  })

  test('resolves a name-based ref with defaultValue', () => {
    const resolved = resolveParser({ name: 'parseAsInteger', defaultValue: 3 })

    expect(resolved.parse('7')).toBe(7)
    expect(resolved.defaultValue).toBe(3)
  })

  test('inherits the defaultValue carried by the named parser', () => {
    installWagen({ parsers: { parseAsScore: parseAsInteger.withDefault(10) } })

    expect(resolveParser({ name: 'parseAsScore' as any }).defaultValue).toBe(10)
  })

  test('an explicit defaultValue wins over the one on the named parser', () => {
    installWagen({ parsers: { parseAsScore: parseAsInteger.withDefault(10) } })

    expect(resolveParser({ name: 'parseAsScore' as any, defaultValue: 1 }).defaultValue).toBe(1)
  })

  test('preserves an explicit undefined defaultValue on a name ref', () => {
    const resolved = resolveParser({ name: 'parseAsInteger', defaultValue: undefined })

    expect('defaultValue' in resolved).toBe(true)
    expect(resolved.defaultValue).toBeUndefined()
  })

  test('resolves a name-based ref against the configured parsers', () => {
    installWagen({ parsers: { parseAsShout } })

    expect(resolveParser({ name: 'parseAsShout' as any }).parse('hi')).toBe('HI')
  })
})

describe('lazy name resolution', () => {
  test('a name can be resolved before the instance that provides it exists', () => {
    const resolved = resolveParser({ name: 'parseAsShout' as any })

    installWagen({ parsers: { parseAsShout } })

    expect(resolved.parse('hi')).toBe('HI')
  })

  test('it follows the active instance instead of the one it first saw', () => {
    const resolved = resolveParser({ name: 'parseAsShout' as any })
    installWagen({ parsers: { parseAsShout } })

    expect(resolved.parse('hi')).toBe('HI')

    installWagen({
      parsers: { parseAsShout: defineParser<string>({ parse: v => `<${v}>`, serialize: String }) },
    })

    expect(resolved.parse('hi')).toBe('<hi>')
  })

  test('falls back to parseAsString for an unknown name and warns once', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const resolved = resolveParser({ name: 'parseAsNonexistent' as any })

    expect(resolved.parse('anything')).toBe('anything')
    expect(resolved.parse('again')).toBe('again')
    expect(resolved.serialize('x')).toBe('x')

    expect(spy).toHaveBeenCalledOnce()
    expect(spy).toHaveBeenCalledWith(
      getMessage(ErrorCodes.UNKNOWN_PARSER_NAME),
      'parseAsNonexistent',
    )
  })

  test('applies defaultValue on top of the parseAsString fallback', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const resolved = resolveParser({
      name: 'parseAsNonexistent' as any,
      defaultValue: 'fallback',
    })

    expect(resolved.parse('test')).toBe('test')
    expect(resolved.defaultValue).toBe('fallback')
  })

  test('does not resolve the name until the parser is used', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    resolveParser({ name: 'parseAsNonexistent' as any })

    expect(spy).not.toHaveBeenCalled()
  })

  test('a direct Parser is never looked up by name', () => {
    installWagen()

    expect(resolveParser(parseAsString).parse('hi')).toBe('hi')
  })
})
