import type { ResolvedRouteStateOptions, RouteStateOptions } from './types'

import { resolveParser } from '../parser/resolve'

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
