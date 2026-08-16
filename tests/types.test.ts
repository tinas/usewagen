import { describe, expectTypeOf, test } from 'vite-plus/test'

import type { ResolvedParserType } from '../src/types'
import type { Parser, ParserWithDefault } from '../src/parser'

describe('ResolvedParserType', () => {
  test('ParserWithDefault infers T (non-nullable)', () => {
    type Result = ResolvedParserType<ParserWithDefault<number, number>>
    expectTypeOf<Result>().toEqualTypeOf<number>()
  })

  test('Parser without default infers T | null', () => {
    type Result = ResolvedParserType<Parser<boolean>>
    expectTypeOf<Result>().toEqualTypeOf<boolean | null>()
  })

  test('name-based with defaultValue infers string (unregistered)', () => {
    type Result = ResolvedParserType<{ name: 'parseAsCustom'; defaultValue: string }>
    expectTypeOf<Result>().toEqualTypeOf<string>()
  })

  test('name-based without defaultValue infers string | null (unregistered)', () => {
    type Result = ResolvedParserType<{ name: 'parseAsCustom' }>
    expectTypeOf<Result>().toEqualTypeOf<string | null>()
  })

  test('ParserWithDefault<string, string> infers string', () => {
    type Result = ResolvedParserType<ParserWithDefault<string, string>>
    expectTypeOf<Result>().toEqualTypeOf<string>()
  })

  test('Parser<Date> infers Date | null', () => {
    type Result = ResolvedParserType<Parser<Date>>
    expectTypeOf<Result>().toEqualTypeOf<Date | null>()
  })
})
