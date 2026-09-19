import type { Ref } from 'vue'
import type { Missing } from '../types'
import type { DefaultValue, Parser, ParserWithDefault } from './parsers'

export type BuiltinParsers = {
  parseAsString: Parser<string>
  parseAsInteger: Parser<number>
  parseAsFloat: Parser<number>
  parseAsIndex: Parser<number>
  parseAsBoolean: Parser<boolean>
  parseAsDate: Parser<Date>
}

export interface CustomParsers {}

export type KnownParsers = BuiltinParsers & Omit<CustomParsers, keyof BuiltinParsers>

export type InferParserValue<P> = P extends Parser<infer T> ? T : never

type NamedParserRef = {
  [K in keyof KnownParsers]: {
    name: K
    defaultValue?: DefaultValue<InferParserValue<KnownParsers[K]>>
  }
}[keyof KnownParsers]

export type ParserInput = (Parser<any> & { name?: never }) | NamedParserRef

export type UnwrapOption<T> = T extends Ref<infer U> ? U : T extends () => infer U ? U : T

export type WithParser<T, P extends ParserInput | undefined, M = unknown> = Omit<
  T,
  'parser' | 'missing'
> & {
  parser?: P
  missing?: M
}

export type InferInputValue<P, M = Missing> = ResolveInputValue<UnwrapOption<P>, M>

type ResolveInputValue<P, M> = [P] extends [undefined]
  ? string | M
  : P extends ParserWithDefault<infer T>
    ? T
    : P extends Parser<infer T>
      ? T | M
      : P extends { name: infer K; defaultValue: any }
        ? K extends keyof KnownParsers
          ? InferParserValue<KnownParsers[K]>
          : string
        : P extends { name: infer K }
          ? K extends keyof KnownParsers
            ? InferParserValue<KnownParsers[K]> | M
            : string | M
          : string | M

type ResolveInputWritable<P, M> =
  ResolveInputValue<P, M> extends infer V ? V | M | null | undefined : never

export type InferInputWritable<P, M = Missing> = ResolveInputWritable<UnwrapOption<P>, M>
