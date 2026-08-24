import type { Ref } from 'vue'
import type {
  HistoryMode,
  InferRouteStateInput,
  InferRouteStateValue,
  RouteStateOptions,
} from './types'
import type { RouteChange } from './use-base-route-state'

import { nextTick } from 'vue'
import { unwrapDefault } from '../parser'
import { useBaseRouteState } from './use-base-route-state'
import { serializeValue, toResolvedOptions } from './utils'

export interface BatchOptions {
  history?: HistoryMode
}

type Refs<TOptions extends readonly RouteStateOptions<any>[]> = {
  [TOption in TOptions[number] as TOption['key']]: Ref<
    InferRouteStateValue<TOption['parser']>,
    InferRouteStateInput<TOption['parser']>
  >
}

type StatePatch<TOptions extends readonly RouteStateOptions<any>[]> = Partial<{
  [TOption in TOptions[number] as TOption['key']]: InferRouteStateInput<TOption['parser']>
}>

type StateSnapshot<TOptions extends readonly RouteStateOptions<any>[]> = {
  [TOption in TOptions[number] as TOption['key']]: InferRouteStateValue<TOption['parser']>
}

export interface UseRouteStatesApi<TOptions extends readonly RouteStateOptions<any>[]> {
  set: (patch: StatePatch<TOptions>, options?: BatchOptions) => void
  reset: (options?: BatchOptions) => void
  toObject: () => StateSnapshot<TOptions>
}

export type UseRouteStatesReturn<TOptions extends readonly RouteStateOptions<any>[]> =
  Refs<TOptions> & UseRouteStatesApi<TOptions>

function resolveBatchHistory(
  candidates: readonly HistoryMode[],
  override: HistoryMode | undefined,
): HistoryMode {
  if (override) return override
  return candidates.includes('push') ? 'push' : 'replace'
}

export function useRouteStates<const TOptions extends readonly RouteStateOptions<any>[]>(
  configs: TOptions,
): UseRouteStatesReturn<TOptions> {
  const { createRouteStateRef, navigate } = useBaseRouteState()

  const resolvedList = configs.map(config => toResolvedOptions(config))

  const refs = Object.fromEntries(
    resolvedList.map(resolved => [resolved.key, createRouteStateRef(resolved)]),
  ) as Refs<TOptions>

  const api: UseRouteStatesApi<TOptions> = {
    set(patch, options) {
      const changes: RouteChange[] = []
      const historyCandidates: HistoryMode[] = []

      for (const resolved of resolvedList) {
        if (!(resolved.key in patch)) continue
        const { urlKey, source, parser, clearOnDefault, history } = resolved
        const next = (patch as Record<string, unknown>)[resolved.key]
        changes.push({
          urlKey,
          source,
          serialized: serializeValue(parser, clearOnDefault, next),
        })
        historyCandidates.push(history)
      }

      if (changes.length === 0) return
      const history = resolveBatchHistory(historyCandidates, options?.history)
      void nextTick(() => {
        navigate(changes, history)
      })
    },
    reset(options) {
      const changes: RouteChange[] = []
      const historyCandidates: HistoryMode[] = []

      for (const resolved of resolvedList) {
        const { urlKey, source, parser, clearOnDefault, history } = resolved
        const next = parser.defaultValue !== undefined ? unwrapDefault(parser.defaultValue) : null
        changes.push({
          urlKey,
          source,
          serialized: serializeValue(parser, clearOnDefault, next),
        })
        historyCandidates.push(history)
      }

      const history = resolveBatchHistory(historyCandidates, options?.history)
      void nextTick(() => {
        navigate(changes, history)
      })
    },
    toObject() {
      const snapshot: Record<string, unknown> = {}
      for (const { key } of resolvedList) {
        snapshot[key] = (refs as Record<string, Ref<any, any>>)[key].value
      }
      return snapshot as StateSnapshot<TOptions>
    },
  }

  return { ...refs, ...api } as UseRouteStatesReturn<TOptions>
}
