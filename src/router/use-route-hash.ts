import type { MaybeRefOrGetter, Ref } from 'vue'
import type { InferInputValue, InferInputWritable, ParserInput } from '../parser/types'
import type { ResolvedParser } from '../parser/resolve'
import type { ResolvedWagenRouterOptions } from '../wagen'
import type { HistoryMode } from './types'

import { computed, customRef, getCurrentScope, nextTick, toValue } from 'vue'
import { ErrorCodes, warnDev } from '../messages'
import { useRoute, useRouter } from 'vue-router'
import { resolveParser } from '../parser/resolve'
import { parseValue, serializeValue } from '../parser/utils'
import { getActiveWagen } from '../wagen'

export interface RouteHashOptions {
  parser?: ParserInput
  history?: HistoryMode
  clearOnDefault?: boolean
}

export type UseRouteHashOptions = MaybeRefOrGetter<RouteHashOptions>

interface ResolvedRouteHashOptions {
  parser: ResolvedParser<any>
  history: HistoryMode
  clearOnDefault: boolean
}

function toResolvedHashOptions(
  input: RouteHashOptions,
  defaults: ResolvedWagenRouterOptions,
): ResolvedRouteHashOptions {
  return {
    parser: resolveParser(input.parser),
    history: input.history ?? defaults.history,
    clearOnDefault: input.clearOnDefault ?? defaults.clearOnDefault,
  }
}

export function useRouteHash<P extends ParserInput | undefined = undefined>(
  options?: MaybeRefOrGetter<Omit<RouteHashOptions, 'parser'> & { parser?: P }>,
): Ref<InferInputValue<P>, InferInputWritable<P>>

export function useRouteHash(options: UseRouteHashOptions = {}) {
  if (!getCurrentScope()) warnDev(ErrorCodes.NO_EFFECT_SCOPE, 'useRouteHash')

  const route = useRoute()
  const router = useRouter()
  const defaults = getActiveWagen().router

  const resolvedOptions = computed<ResolvedRouteHashOptions>(() =>
    toResolvedHashOptions(toValue(options), defaults),
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
