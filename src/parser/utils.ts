import type { ResolvedParser } from './resolve'

import { unwrapDefault } from './parsers'

export function parseValue<T>(
  parser: ResolvedParser<T>,
  raw: string | null | undefined | Array<string | null | undefined>,
): T | null {
  const value = Array.isArray(raw) ? raw.find(v => v != null) : raw
  if (value == null) {
    return parser.defaultValue !== undefined ? unwrapDefault(parser.defaultValue) : null
  }
  const parsed = parser.parse(value)
  if (parsed !== null) return parsed
  return parser.defaultValue !== undefined ? unwrapDefault(parser.defaultValue) : null
}

export function serializeValue<T>(
  parser: ResolvedParser<T>,
  clearOnDefault: boolean,
  next: T | null | undefined,
): string | null {
  if (next == null) return null
  const serialized = parser.serialize(next)
  if (clearOnDefault && parser.defaultValue !== undefined) {
    const defaultSerialized = parser.serialize(unwrapDefault(parser.defaultValue))
    if (serialized === defaultSerialized) return null
  }
  return serialized
}
