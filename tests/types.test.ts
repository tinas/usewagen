import type { Parser, ParserWithDefault } from '../src/parser/parsers'
import type { InferRouteStateInput, InferRouteStateValue } from '../src/router/types'

import { describe, expectTypeOf, test } from 'vite-plus/test'

describe('InferRouteStateValue', () => {
  test('ParserWithDefault<T> infers T (non-nullable)', () => {
    type Result = InferRouteStateValue<ParserWithDefault<number>>
    expectTypeOf<Result>().toEqualTypeOf<number>()
  })

  test('Parser<T> without default infers T | null', () => {
    type Result = InferRouteStateValue<Parser<boolean>>
    expectTypeOf<Result>().toEqualTypeOf<boolean | null>()
  })

  test('name-based ref with defaultValue infers the parser value type', () => {
    type Result = InferRouteStateValue<{ name: 'parseAsInteger'; defaultValue: number }>
    expectTypeOf<Result>().toEqualTypeOf<number>()
  })

  test('name-based ref without defaultValue infers value | null', () => {
    type Result = InferRouteStateValue<{ name: 'parseAsInteger' }>
    expectTypeOf<Result>().toEqualTypeOf<number | null>()
  })

  test('unknown name with defaultValue falls back to string', () => {
    type Result = InferRouteStateValue<{ name: 'parseAsCustom'; defaultValue: string }>
    expectTypeOf<Result>().toEqualTypeOf<string>()
  })

  test('unknown name without defaultValue falls back to string | null', () => {
    type Result = InferRouteStateValue<{ name: 'parseAsCustom' }>
    expectTypeOf<Result>().toEqualTypeOf<string | null>()
  })

  test('Parser<Date> infers Date | null', () => {
    type Result = InferRouteStateValue<Parser<Date>>
    expectTypeOf<Result>().toEqualTypeOf<Date | null>()
  })

  test('an omitted parser (undefined) falls back to string | null', () => {
    type Result = InferRouteStateValue<undefined>
    expectTypeOf<Result>().toEqualTypeOf<string | null>()
  })
})

describe('InferRouteStateInput', () => {
  test('ParserWithDefault<T> widens to T | null | undefined', () => {
    type Result = InferRouteStateInput<ParserWithDefault<number>>
    expectTypeOf<Result>().toEqualTypeOf<number | null | undefined>()
  })

  test('Parser<T> widens to T | null | undefined', () => {
    type Result = InferRouteStateInput<Parser<boolean>>
    expectTypeOf<Result>().toEqualTypeOf<boolean | null | undefined>()
  })

  test('name-based ref with defaultValue widens to T | null | undefined', () => {
    type Result = InferRouteStateInput<{ name: 'parseAsInteger'; defaultValue: number }>
    expectTypeOf<Result>().toEqualTypeOf<number | null | undefined>()
  })

  test('an omitted parser (undefined) widens to string | null | undefined', () => {
    type Result = InferRouteStateInput<undefined>
    expectTypeOf<Result>().toEqualTypeOf<string | null | undefined>()
  })
})
