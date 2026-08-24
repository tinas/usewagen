import type { Parser } from './parsers'

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
    defaultValue?: InferParserValue<KnownParsers[K]>
  }
}[keyof KnownParsers]

export type ParserInput = (Parser<any> & { name?: never }) | NamedParserRef
