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

export type InferInputValue<P> = [P] extends [undefined]
  ? string | null
  : P extends ParserWithDefault<infer T>
    ? T
    : P extends Parser<infer T>
      ? T | null
      : P extends { name: infer K; defaultValue: any }
        ? K extends keyof KnownParsers
          ? InferParserValue<KnownParsers[K]>
          : string
        : P extends { name: infer K }
          ? K extends keyof KnownParsers
            ? InferParserValue<KnownParsers[K]> | null
            : string | null
          : string | null

export type InferInputWritable<P> = InferInputValue<P> | null | undefined
