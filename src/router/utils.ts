import type { ResolvedWagenRouterOptions } from '../wagen'
import type { ResolvedRouteStateOptions, RouteStateOptions } from './types'

import { resolveMissing } from '../options'
import { resolveParser } from '../parser/resolve'

export function toResolvedOptions(
  input: RouteStateOptions,
  defaults: ResolvedWagenRouterOptions,
  missing: unknown,
): ResolvedRouteStateOptions {
  return {
    key: input.key,
    parser: resolveParser(input.parser),
    missing: resolveMissing(input, missing),
    urlKey: input.urlKey ?? input.key,
    source: input.source ?? defaults.source,
    history: input.history ?? defaults.history,
    clearOnDefault: input.clearOnDefault ?? defaults.clearOnDefault,
    mode: input.mode ?? defaults.mode,
  }
}
