import type { MaybeRefOrGetter, Ref } from 'vue'
import type { ParserInput } from '../parser/types'
import type { ResolvedParser } from '../parser/resolve'
import type { HistoryMode, InferRouteStateInput, InferRouteStateValue } from './types'

import { computed, customRef, nextTick, toValue } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveParser } from '../parser/resolve'
import { parseValue, serializeValue } from './utils'

export interface RouteHashOptions<P extends ParserInput = ParserInput> {
  parser?: P
  history?: HistoryMode
  clearOnDefault?: boolean
}

export type UseRouteHashOptions<P extends ParserInput = ParserInput> = MaybeRefOrGetter<
  RouteHashOptions<P>
>

interface ResolvedRouteHashOptions {
  parser: ResolvedParser<any>
  history: HistoryMode
  clearOnDefault: boolean
}

function toResolvedHashOptions(input: RouteHashOptions): ResolvedRouteHashOptions {
  return {
    parser: resolveParser(input.parser),
    history: input.history ?? 'replace',
    clearOnDefault: input.clearOnDefault ?? true,
  }
}

export function useRouteHash<P extends ParserInput>(
  options?: UseRouteHashOptions<P>,
): Ref<InferRouteStateValue<P>, InferRouteStateInput<P>>

export function useRouteHash(options: UseRouteHashOptions = {}) {
  const route = useRoute()
  const router = useRouter()

  const resolvedOptions = computed<ResolvedRouteHashOptions>(() =>
    toResolvedHashOptions(toValue(options)),
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
        void router[history]({
          query: route.query,
          params: route.params,
          hash: serialized === null ? undefined : serialized,
        })
      })
    },
  }))
}
