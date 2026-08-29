import type { ParserInput } from './types'
import type { DefaultValue, Parser, ParserWithDefault } from './parsers'

import { ErrorCodes, warn } from '../messages'
import { getActiveWagen } from '../wagen'
import { builtinParsers, isBuiltinParserName } from './builtins'
import { parseAsString } from './parsers'

export type ResolvedParser<T> = {
  parse: (raw: string) => T | null
  serialize: (value: T) => string
  defaultValue?: DefaultValue<T>
}

export { isBuiltinParserName }

export function getParser(name: string): Parser<any> | undefined {
  if (isBuiltinParserName(name)) return builtinParsers[name]

  const { parsers } = getActiveWagen()
  return Object.hasOwn(parsers, name) ? parsers[name] : undefined
}

function fromParser<T>(parser: Parser<T>): ResolvedParser<T> {
  const resolved: ResolvedParser<T> = {
    parse: parser.parse,
    serialize: parser.serialize,
  }
  if ('defaultValue' in parser) {
    resolved.defaultValue = (parser as ParserWithDefault<T>).defaultValue
  }
  return resolved
}

function fromName(
  name: string,
  override?: { defaultValue: DefaultValue<any> },
): ResolvedParser<any> {
  let warned = false

  function get(): Parser<any> {
    const found = getParser(name)
    if (found) return found

    if (!warned) {
      warned = true
      warn(ErrorCodes.UNKNOWN_PARSER_NAME, name)
    }
    return parseAsString
  }

  const base = {
    parse: (raw: string) => get().parse(raw),
    serialize: (value: any) => get().serialize(value),
  }

  if (override) return { ...base, defaultValue: override.defaultValue }

  return {
    ...base,
    get defaultValue() {
      return (get() as ParserWithDefault<any>).defaultValue
    },
  }
}

export function resolveParser(input: ParserInput = { name: 'parseAsString' }): ResolvedParser<any> {
  if ('parse' in input) return fromParser(input)

  const override = 'defaultValue' in input ? { defaultValue: input.defaultValue } : undefined
  return fromName(input.name, override)
}
