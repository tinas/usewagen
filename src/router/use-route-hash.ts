import type { Ref } from 'vue'
import type { Missing, ReactiveFields, ReactiveOptions, StateMode } from '../types'
import type {
  InferInputValue,
  InferInputWritable,
  ParserInput,
  UnwrapOption,
  WithParser,
} from '../parser/types'
import type { ResolvedParser } from '../parser/resolve'
import type { ResolvedWagenRouterOptions } from '../wagen'
import type { HistoryMode } from './types'

import { computed, customRef, getCurrentScope } from 'vue'
import { ErrorCodes, warnDev } from '../messages'
import { useRoute, useRouter } from 'vue-router'
import { resolveMissing, toValueDeep } from '../options'
import { resolveParser } from '../parser/resolve'
import { parseValue, serializeValue } from '../parser/utils'
import { getActiveWagen } from '../wagen'
import { enqueue } from './queue'

export interface RouteHashOptions {
  parser?: ParserInput
  missing?: unknown
  history?: HistoryMode
  clearOnDefault?: boolean
  mode?: StateMode
}

export type UseRouteHashOptions<
  P extends ParserInput | undefined = ParserInput | undefined,
  M = unknown,
> = ReactiveOptions<WithParser<RouteHashOptions, P, M>, 'missing'>

export type RouteHashConfig = ReactiveFields<RouteHashOptions, 'missing'>

interface ResolvedRouteHashOptions {
  parser: ResolvedParser<any>
  missing: unknown
  history: HistoryMode
  clearOnDefault: boolean
  mode: StateMode
}

function toResolvedHashOptions(
  options: RouteHashOptions,
  defaults: ResolvedWagenRouterOptions,
  missing: unknown,
): ResolvedRouteHashOptions {
  return {
    parser: resolveParser(options.parser),
    missing: resolveMissing(options, missing),
    history: options.history ?? defaults.history,
    clearOnDefault: options.clearOnDefault ?? defaults.clearOnDefault,
    mode: options.mode ?? defaults.mode,
  }
}

export function useRouteHash<P extends ParserInput | undefined = undefined, const M = Missing>(
  options?: UseRouteHashOptions<P, M>,
): Ref<InferInputValue<P, UnwrapOption<M>>, InferInputWritable<P, UnwrapOption<M>>>

export function useRouteHash(options: UseRouteHashOptions = {}) {
  if (!getCurrentScope()) warnDev(ErrorCodes.NO_EFFECT_SCOPE, 'useRouteHash')

  const route = useRoute()
  const router = useRouter()
  const { router: defaults, missing } = getActiveWagen()

  const resolvedOptions = computed<ResolvedRouteHashOptions>(() =>
    toResolvedHashOptions(toValueDeep<RouteHashOptions>(options), defaults, missing),
  )

  let cache: { seen: string | null; raw: string | null } | null = null
  let generation = 0
  let trigger!: () => void

  function currentHash(): string | null {
    return route.hash === '' ? null : route.hash
  }

  return customRef((track, triggerRef) => {
    trigger = triggerRef

    return {
      get: () => {
        track()
        const resolved = resolvedOptions.value
        const current = currentHash()

        if (resolved.mode === 'source') {
          cache = null
          return parseValue(resolved, current)
        }

        if (cache && cache.seen === current) return parseValue(resolved, cache.raw)

        cache = { seen: current, raw: current }
        return parseValue(resolved, current)
      },
      set: next => {
        const resolved = resolvedOptions.value
        const { history, mode } = resolved
        const serialized = serializeValue(resolved, next)
        const optimistic = mode === 'optimistic'
        const own = ++generation

        if (optimistic) {
          cache = { seen: currentHash(), raw: serialized }
          trigger()
        }

        void enqueue(router, { history, hash: serialized }).then(() => {
          if (!optimistic || generation !== own) return
          cache = null
          trigger()
        })
      },
    }
  })
}
