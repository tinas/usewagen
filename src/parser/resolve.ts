import type { ParserInput } from './types'
import type { DefaultValue, Parser, ParserWithDefault } from './parsers'

import {
  parseAsBoolean,
  parseAsDate,
  parseAsFloat,
  parseAsIndex,
  parseAsInteger,
  parseAsString,
} from './parsers'

export type ResolvedParser<T> = {
  parse: (raw: string) => T | null
  serialize: (value: T) => string
  defaultValue?: DefaultValue<T>
}

const builtins = new Map<string, Parser<any>>([
  ['parseAsString', parseAsString],
  ['parseAsInteger', parseAsInteger],
  ['parseAsFloat', parseAsFloat],
  ['parseAsIndex', parseAsIndex],
  ['parseAsBoolean', parseAsBoolean],
  ['parseAsDate', parseAsDate],
])

const registry = new Map<string, Parser<any>>()

export function isBuiltinParserName(name: string): boolean {
  return builtins.has(name)
}

export function registerParser(name: string, parser: Parser<any>): void {
  if (builtins.has(name)) {
    console.warn(
      `[usewagen] "${name}" is a built-in parser name and cannot be overridden — registration ignored.`,
    )
    return
  }
  registry.set(name, parser)
}

export function getParser(name: string): Parser<any> | undefined {
  return builtins.get(name) ?? registry.get(name)
}

function toResolvedParser<T>(parser: Parser<T>): ResolvedParser<T> {
  const resolved: ResolvedParser<T> = {
    parse: parser.parse,
    serialize: parser.serialize,
  }
  if ('defaultValue' in parser) {
    resolved.defaultValue = (parser as ParserWithDefault<T>).defaultValue
  }
  return resolved
}

export function resolveParser(input: ParserInput = { name: 'parseAsString' }): ResolvedParser<any> {
  if ('parse' in input) {
    return toResolvedParser(input)
  }
  const parser = getParser(input.name) ?? parseAsString
  const resolved = toResolvedParser(parser)
  if ('defaultValue' in input) {
    resolved.defaultValue = input.defaultValue
  }
  return resolved
}
