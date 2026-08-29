import type { ResolvedWagenRouterOptions } from '../wagen'
import type { ResolvedRouteStateOptions, RouteStateOptions } from './types'

import { resolveParser } from '../parser/resolve'

export function toResolvedOptions(
  input: RouteStateOptions,
  defaults: ResolvedWagenRouterOptions,
): ResolvedRouteStateOptions {
  return {
    key: input.key,
    parser: resolveParser(input.parser),
    urlKey: input.urlKey ?? input.key,
    source: input.source ?? defaults.source,
    history: input.history ?? defaults.history,
    clearOnDefault: input.clearOnDefault ?? defaults.clearOnDefault,
  }
}
