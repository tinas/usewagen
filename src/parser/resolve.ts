import type { ParserLike } from '../types'
import type { Parser } from './index'
import {
  parseAsBoolean,
  parseAsDate,
  parseAsFloat,
  parseAsIndex,
  parseAsInteger,
  parseAsString,
} from './index'

const registry = new Map<string, Parser<any>>()

registry.set('parseAsString', parseAsString)
registry.set('parseAsInteger', parseAsInteger)
registry.set('parseAsFloat', parseAsFloat)
registry.set('parseAsIndex', parseAsIndex)
registry.set('parseAsBoolean', parseAsBoolean)
registry.set('parseAsDate', parseAsDate)

/** Registers a parser instance into the global registry by name. */
export function registerParser(name: string, parser: Parser<any>): void {
  registry.set(name, parser)
}

/** Looks up a parser by name from the registry. */
export function getParser(name: string): Parser<any> | undefined {
  return registry.get(name)
}

/** Resolves a parser input (direct instance or name reference) into a usable parser. */
export function resolveParser(input: ParserLike): Parser<any> {
  if ('get' in input) {
    return input
  }

  const parser: Parser<any> = getParser(input.name) ?? parseAsString
  if ('defaultValue' in input) {
    return parser.default(input.defaultValue)
  }

  return parser
}
