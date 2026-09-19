import type { ComputedRef, Ref } from 'vue'
import type { Parser, ParserWithDefault } from '../../src/parser/parsers'
import type { InferInputValue, InferInputWritable, ParserInput } from '../../src/parser/types'
import type { Missing } from '../../src/types'

import { describe, expect, expectTypeOf, test } from 'vite-plus/test'

describe('InferInputValue', () => {
  test('ParserWithDefault<T> infers T (non-nullable)', () => {
    type Result = InferInputValue<ParserWithDefault<number>>
    expectTypeOf<Result>().toEqualTypeOf<number>()
  })

  test('Parser<T> without default infers T | null', () => {
    type Result = InferInputValue<Parser<boolean>>
    expectTypeOf<Result>().toEqualTypeOf<boolean | null>()
  })

  test('name-based ref with defaultValue infers the parser value type', () => {
    type Result = InferInputValue<{ name: 'parseAsInteger'; defaultValue: number }>
    expectTypeOf<Result>().toEqualTypeOf<number>()
  })

  test('name-based ref with a factory defaultValue infers the parser value type', () => {
    type Result = InferInputValue<{ name: 'parseAsInteger'; defaultValue: () => number }>
    expectTypeOf<Result>().toEqualTypeOf<number>()
  })

  test('name-based ref without defaultValue infers value | null', () => {
    type Result = InferInputValue<{ name: 'parseAsInteger' }>
    expectTypeOf<Result>().toEqualTypeOf<number | null>()
  })

  test('unknown name with defaultValue falls back to string', () => {
    type Result = InferInputValue<{ name: 'parseAsCustom'; defaultValue: string }>
    expectTypeOf<Result>().toEqualTypeOf<string>()
  })

  test('unknown name without defaultValue falls back to string | null', () => {
    type Result = InferInputValue<{ name: 'parseAsCustom' }>
    expectTypeOf<Result>().toEqualTypeOf<string | null>()
  })

  test('Parser<Date> infers Date | null', () => {
    type Result = InferInputValue<Parser<Date>>
    expectTypeOf<Result>().toEqualTypeOf<Date | null>()
  })

  test('an omitted parser (undefined) falls back to string | null', () => {
    type Result = InferInputValue<undefined>
    expectTypeOf<Result>().toEqualTypeOf<string | null>()
  })
})

describe('InferInputWritable', () => {
  test('ParserWithDefault<T> widens to T | null | undefined', () => {
    type Result = InferInputWritable<ParserWithDefault<number>>
    expectTypeOf<Result>().toEqualTypeOf<number | null | undefined>()
  })

  test('Parser<T> widens to T | null | undefined', () => {
    type Result = InferInputWritable<Parser<boolean>>
    expectTypeOf<Result>().toEqualTypeOf<boolean | null | undefined>()
  })

  test('name-based ref with defaultValue widens to T | null | undefined', () => {
    type Result = InferInputWritable<{ name: 'parseAsInteger'; defaultValue: number }>
    expectTypeOf<Result>().toEqualTypeOf<number | null | undefined>()
  })

  test('an omitted parser (undefined) widens to string | null | undefined', () => {
    type Result = InferInputWritable<undefined>
    expectTypeOf<Result>().toEqualTypeOf<string | null | undefined>()
  })

  test('a parser behind a ref or a computed widens like the plain parser', () => {
    expectTypeOf<InferInputWritable<Ref<Parser<number>>>>().toEqualTypeOf<
      number | null | undefined
    >()
    expectTypeOf<InferInputWritable<ComputedRef<ParserWithDefault<number>>>>().toEqualTypeOf<
      number | null | undefined
    >()
  })
})

describe('named parser ref defaultValue', () => {
  test('accepts both a value and a factory, and rejects the wrong type', () => {
    const asValue: ParserInput = { name: 'parseAsInteger', defaultValue: 1 }
    const asFactory: ParserInput = { name: 'parseAsInteger', defaultValue: () => 1 }

    function reject() {
      // @ts-expect-error the factory must return the parser value type
      const bad: ParserInput = { name: 'parseAsInteger', defaultValue: () => 'nope' }
      return bad
    }

    expect([asValue, asFactory]).toHaveLength(2)
    expect(typeof reject).toBe('function')
  })
})

describe('Missing', () => {
  test('is null until Register says otherwise', () => {
    expectTypeOf<Missing>().toEqualTypeOf<null>()
  })
})

describe('InferInputValue with a missing value', () => {
  test('Parser<T> infers T | E', () => {
    expectTypeOf<InferInputValue<Parser<number>, undefined>>().toEqualTypeOf<number | undefined>()
  })

  test('ParserWithDefault<T> ignores E, since the default always answers', () => {
    expectTypeOf<InferInputValue<ParserWithDefault<number>, undefined>>().toEqualTypeOf<number>()
  })

  test('a name-based ref infers value | E', () => {
    expectTypeOf<InferInputValue<{ name: 'parseAsInteger' }, undefined>>().toEqualTypeOf<
      number | undefined
    >()
  })

  test('an omitted parser infers string | E', () => {
    expectTypeOf<InferInputValue<undefined, undefined>>().toEqualTypeOf<string | undefined>()
  })

  test('any value can stand in for the missing one', () => {
    expectTypeOf<InferInputValue<Parser<number>, 'none'>>().toEqualTypeOf<number | 'none'>()
  })
})

describe('InferInputWritable with a missing value', () => {
  test('Parser<T> widens to T | E | null | undefined', () => {
    expectTypeOf<InferInputWritable<Parser<number>, undefined>>().toEqualTypeOf<
      number | null | undefined
    >()
    expectTypeOf<InferInputWritable<Parser<number>, 'none'>>().toEqualTypeOf<
      number | 'none' | null | undefined
    >()
  })

  test('ParserWithDefault<T> still accepts E, which clears the value', () => {
    expectTypeOf<InferInputWritable<ParserWithDefault<number>, 'none'>>().toEqualTypeOf<
      number | 'none' | null | undefined
    >()
  })

  test('a name-based ref widens to value | E | null | undefined', () => {
    expectTypeOf<InferInputWritable<{ name: 'parseAsInteger' }, undefined>>().toEqualTypeOf<
      number | null | undefined
    >()
    expectTypeOf<InferInputWritable<{ name: 'parseAsInteger' }, 'none'>>().toEqualTypeOf<
      number | 'none' | null | undefined
    >()
  })

  test('null and undefined stay writable whatever E is', () => {
    expectTypeOf<null>().toExtend<InferInputWritable<Parser<number>, 'none'>>()
    expectTypeOf<undefined>().toExtend<InferInputWritable<Parser<number>, 'none'>>()
    expectTypeOf<null>().toExtend<InferInputWritable<ParserWithDefault<number>, -1>>()
  })
})
