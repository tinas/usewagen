import type { Ref } from 'vue'
import type { ReactiveFields, ReactiveOptions, StateMode } from '../types'
import type { InferInputValue, InferInputWritable, ParserInput, WithParser } from '../parser/types'
import type { ResolvedParser } from '../parser/resolve'
import type { ResolvedWagenRouterOptions } from '../wagen'
import type { HistoryMode } from './types'

import { computed, customRef, getCurrentScope } from 'vue'
import { ErrorCodes, warnDev } from '../messages'
import { useRoute, useRouter } from 'vue-router'
import { toValueDeep } from '../options'
import { resolveParser } from '../parser/resolve'
import { parseValue, serializeValue } from '../parser/utils'
import { getActiveWagen } from '../wagen'
import { enqueue } from './queue'

export interface RouteHashOptions {
  parser?: ParserInput
  history?: HistoryMode
  clearOnDefault?: boolean
  mode?: StateMode
}

export type UseRouteHashOptions<P extends ParserInput | undefined = ParserInput | undefined> =
  ReactiveOptions<WithParser<RouteHashOptions, P>>

export type RouteHashConfig = ReactiveFields<RouteHashOptions>

interface ResolvedRouteHashOptions {
  parser: ResolvedParser<any>
  history: HistoryMode
  clearOnDefault: boolean
  mode: StateMode
}

function toResolvedHashOptions(
  options: RouteHashOptions,
  defaults: ResolvedWagenRouterOptions,
): ResolvedRouteHashOptions {
  return {
    parser: resolveParser(options.parser),
    history: options.history ?? defaults.history,
    clearOnDefault: options.clearOnDefault ?? defaults.clearOnDefault,
    mode: options.mode ?? defaults.mode,
  }
}

export function useRouteHash<P extends ParserInput | undefined = undefined>(
  options?: UseRouteHashOptions<P>,
): Ref<InferInputValue<P>, InferInputWritable<P>>

export function useRouteHash(options: UseRouteHashOptions = {}) {
  if (!getCurrentScope()) warnDev(ErrorCodes.NO_EFFECT_SCOPE, 'useRouteHash')

  const route = useRoute()
  const router = useRouter()
  const defaults = getActiveWagen().router

  const resolvedOptions = computed<ResolvedRouteHashOptions>(() =>
    toResolvedHashOptions(toValueDeep<RouteHashOptions>(options), defaults),
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
        const { parser, mode } = resolvedOptions.value
        const current = currentHash()

        if (mode === 'source') {
          cache = null
          return parseValue(parser, current)
        }

        if (cache && cache.seen === current) return parseValue(parser, cache.raw)

        cache = { seen: current, raw: current }
        return parseValue(parser, current)
      },
      set: next => {
        const { parser, clearOnDefault, history, mode } = resolvedOptions.value
        const serialized = serializeValue(parser, clearOnDefault, next)
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
