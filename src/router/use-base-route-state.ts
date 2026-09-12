import type { MaybeRefOrGetter, Ref } from 'vue'
import type { HistoryMode, ResolvedRouteStateOptions, RouteStateSource } from './types'

import { customRef, toValue } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { normalizeRaw, parseValue, serializeValue } from '../parser/utils'
import { enqueue } from './queue'

export interface RouteStateHandle {
  state: Ref<any, any>
  write: (serialized: string | null, history?: HistoryMode) => Promise<void>
}

export function useBaseRouteState() {
  const route = useRoute()
  const router = useRouter()

  function createRouteStateRef(
    options: MaybeRefOrGetter<ResolvedRouteStateOptions>,
  ): RouteStateHandle {
    let cache: { seen: string | null; raw: string | null } | null = null
    let generation = 0
    let trigger!: () => void

    function rawValue(urlKey: string, source: RouteStateSource) {
      return source === 'params' ? route.params[urlKey] : route.query[urlKey]
    }

    const state = customRef((track, triggerRef) => {
      trigger = triggerRef

      return {
        get: () => {
          track()
          const { urlKey, source, parser, mode } = toValue(options)
          const current = normalizeRaw(rawValue(urlKey, source))

          if (mode === 'source') {
            cache = null
            return parseValue(parser, current)
          }

          if (cache && cache.seen === current) return parseValue(parser, cache.raw)

          cache = { seen: current, raw: current }
          return parseValue(parser, current)
        },
        set: next => {
          const { parser, clearOnDefault } = toValue(options)
          void write(serializeValue(parser, clearOnDefault, next))
        },
      }
    })

    function write(serialized: string | null, history?: HistoryMode): Promise<void> {
      const resolved = toValue(options)
      const optimistic = resolved.mode === 'optimistic'
      const current = ++generation

      if (optimistic) {
        cache = {
          seen: normalizeRaw(rawValue(resolved.urlKey, resolved.source)),
          raw: serialized,
        }
        trigger()
      }

      const settled = enqueue(router, {
        history: history ?? resolved.history,
        changes: [{ urlKey: resolved.urlKey, source: resolved.source, serialized }],
      })

      return settled.then(() => {
        if (!optimistic || generation !== current) return
        cache = null
        trigger()
      })
    }

    return { state, write }
  }

  return { createRouteStateRef }
}
