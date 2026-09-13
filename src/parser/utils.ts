import type { ResolvedParser } from './resolve'

import { unwrapDefault } from './parsers'

export type RawValue = string | null | undefined | Array<string | null | undefined>

export function normalizeRaw(raw: RawValue): string | null {
  const value = Array.isArray(raw) ? raw.find(v => v != null) : raw
  return value ?? null
}

export function parseValue<T>(parser: ResolvedParser<T>, raw: RawValue): T | null {
  const value = normalizeRaw(raw)
  if (value === null) {
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
