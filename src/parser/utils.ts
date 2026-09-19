import type { ResolvedParser } from './resolve'

import { unwrapDefault } from './parsers'

export type RawValue = string | null | undefined | Array<string | null | undefined>

export function normalizeRaw(raw: RawValue): string | null {
  const value = Array.isArray(raw) ? raw.find(v => v != null) : raw
  return value ?? null
}

export function parseValue<T, M>(
  options: { parser: ResolvedParser<T>; missing: M },
  raw: RawValue,
): T | M {
  const { parser, missing } = options
  const value = normalizeRaw(raw)
  const parsed = value === null ? null : parser.parse(value)
  if (parsed !== null) return parsed
  return parser.defaultValue !== undefined ? unwrapDefault(parser.defaultValue) : missing
}

export function serializeValue<T, M>(
  options: { parser: ResolvedParser<T>; clearOnDefault: boolean; missing: M },
  next: T | M | null | undefined,
): string | null {
  const { parser, clearOnDefault, missing } = options
  if (next == null || Object.is(next, missing)) return null
  const serialized = parser.serialize(next as T)
  if (clearOnDefault && parser.defaultValue !== undefined) {
    const defaultSerialized = parser.serialize(unwrapDefault(parser.defaultValue))
    if (serialized === defaultSerialized) return null
  }
  return serialized
}
