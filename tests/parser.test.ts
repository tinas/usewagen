import { describe, expect, test } from 'vite-plus/test'

import {
  defineParser,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsDate,
  parseAsFloat,
  parseAsIndex,
  parseAsInteger,
  parseAsJson,
  parseAsMap,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringEnum,
  parseAsStringLiteral,
  resolveDefault,
} from '../src'

describe('resolveDefault', () => {
  test('resolves a plain value', () => {
    expect(resolveDefault(42)).toBe(42)
  })

  test('resolves a factory function', () => {
    expect(resolveDefault(() => 'hello')).toBe('hello')
  })
})

describe('defineParser', () => {
  test('creates a parser with parse and serialize', () => {
    const parser = defineParser({ get: v => Number(v), set: v => String(v) })

    expect(parser.get('123')).toBe(123)
    expect(parser.set(456)).toBe('456')
  })

  test('.default() creates a parser with defaultValue', () => {
    const parser = parseAsString.default('fallback')

    expect(parser.defaultValue).toBe('fallback')
    expect(parser.get('hi')).toBe('hi')
    expect(parser.set('hi')).toBe('hi')
  })
})

describe('parseAsString', () => {
  test('parses any string as-is', () => {
    expect(parseAsString.get('hello')).toBe('hello')
    expect(parseAsString.get('')).toBe('')
  })

  test('serializes a string as-is', () => {
    expect(parseAsString.set('world')).toBe('world')
  })
})

describe('parseAsInteger', () => {
  test('parses valid integers', () => {
    expect(parseAsInteger.get('42')).toBe(42)
    expect(parseAsInteger.get('-7')).toBe(-7)
  })

  test('returns null for invalid input', () => {
    expect(parseAsInteger.get('abc')).toBeNull()
    expect(parseAsInteger.get('')).toBeNull()
  })

  test('serializes by truncating', () => {
    expect(parseAsInteger.set(3.9)).toBe('3')
  })
})

describe('parseAsFloat', () => {
  test('parses valid floats', () => {
    expect(parseAsFloat.get('3.14')).toBeCloseTo(3.14)
  })

  test('returns null for invalid input', () => {
    expect(parseAsFloat.get('abc')).toBeNull()
  })

  test('serializes floats', () => {
    expect(parseAsFloat.set(2.5)).toBe('2.5')
  })
})

describe('parseAsIndex', () => {
  test('parses 1-based index to 0-based', () => {
    expect(parseAsIndex.get('1')).toBe(0)
    expect(parseAsIndex.get('5')).toBe(4)
  })

  test('serializes 0-based to 1-based', () => {
    expect(parseAsIndex.set(0)).toBe('1')
    expect(parseAsIndex.set(4)).toBe('5')
  })

  test('returns null for invalid input', () => {
    expect(parseAsIndex.get('abc')).toBeNull()
  })
})

describe('parseAsBoolean', () => {
  test('parses true/false strings', () => {
    expect(parseAsBoolean.get('true')).toBe(true)
    expect(parseAsBoolean.get('false')).toBe(false)
  })

  test('returns null for invalid input', () => {
    expect(parseAsBoolean.get('yes')).toBeNull()
    expect(parseAsBoolean.get('')).toBeNull()
  })

  test('serializes booleans', () => {
    expect(parseAsBoolean.set(true)).toBe('true')
    expect(parseAsBoolean.set(false)).toBe('false')
  })
})

describe('parseAsStringLiteral', () => {
  const parser = parseAsStringLiteral(['a', 'b', 'c'] as const)

  test('parses valid values', () => {
    expect(parser.get('a')).toBe('a')
    expect(parser.get('b')).toBe('b')
  })

  test('returns null for invalid values', () => {
    expect(parser.get('d')).toBeNull()
  })
})

describe('parseAsNumberLiteral', () => {
  const parser = parseAsNumberLiteral([1, 2, 3] as const)

  test('parses valid number values', () => {
    expect(parser.get('1')).toBe(1)
    expect(parser.get('3')).toBe(3)
  })

  test('returns null for invalid values', () => {
    expect(parser.get('5')).toBeNull()
    expect(parser.get('abc')).toBeNull()
  })
})

describe('parseAsStringEnum', () => {
  enum Color {
    Red = 'red',
    Blue = 'blue',
  }
  const parser = parseAsStringEnum(Object.values(Color))

  test('parses valid enum values', () => {
    expect(parser.get('red')).toBe('red')
  })

  test('returns null for invalid values', () => {
    expect(parser.get('green')).toBeNull()
  })
})

describe('parseAsDate', () => {
  test('parses date strings (YYYY-MM-DD)', () => {
    const d = parseAsDate.get('2024-01-15')

    expect(d).toBeInstanceOf(Date)
    expect(d!.toISOString().startsWith('2024-01-15')).toBe(true)
  })

  test('parses ISO datetime strings', () => {
    const d = parseAsDate.get('2024-01-15T10:30:00.000Z')

    expect(d).toBeInstanceOf(Date)
  })

  test('returns null for invalid dates', () => {
    expect(parseAsDate.get('not-a-date')).toBeNull()
  })

  test('serializes to YYYY-MM-DD', () => {
    const d = new Date('2024-06-01T00:00:00.000Z')

    expect(parseAsDate.set(d)).toBe('2024-06-01')
  })

  test('.iso() parses and serializes full ISO strings', () => {
    const isoParser = parseAsDate.iso()
    const d = isoParser.get('2024-01-15T10:30:00.000Z')

    expect(d).toBeInstanceOf(Date)
    expect(isoParser.set(d!)).toBe('2024-01-15T10:30:00.000Z')
  })

  test('.timestamp() parses and serializes timestamps', () => {
    const tsParser = parseAsDate.timestamp()
    const now = new Date()
    const serialized = tsParser.set(now)

    expect(serialized).toBe(now.getTime().toString())

    const parsed = tsParser.get(serialized)

    expect(parsed!.getTime()).toBe(now.getTime())
  })
})

describe('parseAsArrayOf', () => {
  const parser = parseAsArrayOf(parseAsInteger)

  test('parses comma-separated integers', () => {
    expect(parser.get('1,2,3')).toEqual([1, 2, 3])
  })

  test('parses empty string as empty array', () => {
    expect(parser.get('')).toEqual([])
  })

  test('returns null if any item is invalid', () => {
    expect(parser.get('1,abc,3')).toBeNull()
  })

  test('serializes arrays', () => {
    expect(parser.set([1, 2, 3])).toBe('1,2,3')
  })

  test('supports custom separator', () => {
    const p = parseAsArrayOf(parseAsString, '|')

    expect(p.get('a|b|c')).toEqual(['a', 'b', 'c'])
    expect(p.set(['x', 'y'])).toBe('x|y')
  })
})

describe('parseAsJson', () => {
  const parser = parseAsJson<{ name: string }>()

  test('parses valid JSON', () => {
    expect(parser.get('{"name":"test"}')).toEqual({ name: 'test' })
  })

  test('returns null for invalid JSON', () => {
    expect(parser.get('not json')).toBeNull()
  })

  test('serializes to JSON string', () => {
    expect(parser.set({ name: 'test' })).toBe('{"name":"test"}')
  })
})

describe('parseAsMap', () => {
  const parser = parseAsMap(parseAsString, parseAsInteger)

  test('parses map from string', () => {
    const result = parser.get('a:1;b:2')

    expect(result).toBeInstanceOf(Map)
    expect(result!.get('a')).toBe(1)
    expect(result!.get('b')).toBe(2)
  })

  test('parses empty string as empty map', () => {
    const result = parser.get('')

    expect(result!.size).toBe(0)
  })

  test('returns null for invalid entries', () => {
    expect(parser.get('invalid')).toBeNull()
  })

  test('returns null for invalid values', () => {
    expect(parser.get('a:abc')).toBeNull()
  })

  test('serializes map to string', () => {
    const map = new Map([
      ['x', 10],
      ['y', 20],
    ])

    expect(parser.set(map)).toBe('x:10;y:20')
  })
})
