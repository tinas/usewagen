import type { Ref } from 'vue'
import type { ReactiveOptions } from '../options'
import type { InferInputValue, InferInputWritable, ParserInput } from '../parser/types'
import type { ResolvedParser } from '../parser/resolve'
import type { ResolvedWagenRouterOptions } from '../wagen'
import type { HistoryMode } from './types'

import { computed, customRef, getCurrentScope, nextTick } from 'vue'
import { ErrorCodes, warnDev } from '../messages'
import { useRoute, useRouter } from 'vue-router'
import { toValueDeep } from '../options'
import { resolveParser } from '../parser/resolve'
import { parseValue, serializeValue } from '../parser/utils'
import { getActiveWagen } from '../wagen'

export interface RouteHashOptions {
  parser?: ParserInput
  history?: HistoryMode
  clearOnDefault?: boolean
}

export type UseRouteHashOptions<P extends ParserInput | undefined = ParserInput | undefined> =
  ReactiveOptions<Omit<RouteHashOptions, 'parser'> & { parser?: P }, 'parser'>

interface ResolvedRouteHashOptions {
  parser: ResolvedParser<any>
  history: HistoryMode
  clearOnDefault: boolean
}

function toResolvedHashOptions(
  options: RouteHashOptions,
  defaults: ResolvedWagenRouterOptions,
): ResolvedRouteHashOptions {
  return {
    parser: resolveParser(options.parser),
    history: options.history ?? defaults.history,
    clearOnDefault: options.clearOnDefault ?? defaults.clearOnDefault,
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

  return customRef(track => ({
    get: () => {
      track()
      const raw = route.hash === '' ? undefined : route.hash
      return parseValue(resolvedOptions.value.parser, raw)
    },
    set: next => {
      const { parser, history, clearOnDefault } = resolvedOptions.value
      const serialized = serializeValue(parser, clearOnDefault, next)
      void nextTick(() => {
        const current = route.hash === '' ? null : route.hash
        if (current === serialized) return

        void router[history]({
          query: route.query,
          params: route.params,
          hash: serialized === null ? undefined : serialized,
        })
      })
    },
  }))
}
