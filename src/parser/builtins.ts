import type { BuiltinParsers } from './types'

import {
  parseAsBoolean,
  parseAsDate,
  parseAsFloat,
  parseAsIndex,
  parseAsInteger,
  parseAsString,
} from './parsers'

export const builtinParsers: BuiltinParsers = {
  parseAsString,
  parseAsInteger,
  parseAsFloat,
  parseAsIndex,
  parseAsBoolean,
  parseAsDate,
}

export function isBuiltinParserName(name: string): name is keyof BuiltinParsers {
  return Object.hasOwn(builtinParsers, name)
}
