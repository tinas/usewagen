import type { ResolvedParser } from '../parser/resolve'
import type { ResolvedRouteStateOptions, RouteStateOptions } from './types'

import { unwrapDefault } from '../parser'
import { resolveParser } from '../parser/resolve'

export type RouteRawValue = string | null | undefined | Array<string | null>

export function toResolvedOptions(input: RouteStateOptions): ResolvedRouteStateOptions {
  return {
    key: input.key,
    parser: resolveParser(input.parser),
    urlKey: input.urlKey ?? input.key,
    source: input.source ?? 'query',
    history: input.history ?? 'replace',
    clearOnDefault: input.clearOnDefault ?? true,
  }
}

export function parseValue<T>(parser: ResolvedParser<T>, raw: RouteRawValue): T | null {
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
