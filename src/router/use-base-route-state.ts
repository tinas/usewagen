import type { MaybeRefOrGetter, Ref } from 'vue'
import type { LocationQueryRaw, RouteParamsRaw } from 'vue-router'
import type { HistoryMode, ResolvedRouteStateOptions, RouteStateSource } from './types'

import { customRef, nextTick, toValue } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { parseValue, serializeValue } from '../parser/utils'

export interface RouteChange {
  urlKey: string
  source: RouteStateSource
  serialized: string | null
}

export function useBaseRouteState() {
  const route = useRoute()
  const router = useRouter()

  function hasChanged(change: RouteChange): boolean {
    const current =
      change.source === 'params' ? route.params[change.urlKey] : route.query[change.urlKey]

    if (Array.isArray(current)) return true
    if (change.serialized === null) return current !== undefined
    return current !== change.serialized
  }

  function navigate(changes: RouteChange[], history: HistoryMode) {
    const changed = changes.filter(hasChanged)
    if (changed.length === 0) return

    const params: RouteParamsRaw = { ...route.params }
    const query: LocationQueryRaw = { ...route.query }

    for (const change of changed) {
      const target = change.source === 'params' ? params : query
      target[change.urlKey] = change.serialized === null ? undefined : change.serialized
    }

    void router[history]({
      params,
      query,
      hash: route.hash,
    })
  }

  function createRouteStateRef(
    options: MaybeRefOrGetter<ResolvedRouteStateOptions>,
  ): Ref<any, any> {
    return customRef(track => ({
      get: () => {
        track()
        const { urlKey, source, parser } = toValue(options)
        const raw = source === 'params' ? route.params[urlKey] : route.query[urlKey]
        return parseValue(parser, raw)
      },
      set: next => {
        const { urlKey, source, parser, history, clearOnDefault } = toValue(options)
        const serialized = serializeValue(parser, clearOnDefault, next)
        void nextTick(() => {
          navigate([{ urlKey, source, serialized }], history)
        })
      },
    }))
  }

  return { createRouteStateRef, navigate }
}
