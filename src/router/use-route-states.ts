import type { ComputedRef, Ref } from 'vue'
import type { ReactiveFields } from '../options'
import type { InferInputValue, InferInputWritable, ParserInput } from '../parser/types'
import type { HistoryMode, ResolvedRouteStateOptions, RouteStateOptions } from './types'
import type { RouteChange } from './use-base-route-state'

import { computed, getCurrentScope, nextTick } from 'vue'
import { ErrorCodes, warnDev } from '../messages'
import { toValueDeep } from '../options'
import { unwrapDefault } from '../parser'
import { getActiveWagen } from '../wagen'
import { serializeValue } from '../parser/utils'
import { useBaseRouteState } from './use-base-route-state'
import { toResolvedOptions } from './utils'

export type RouteStateConfig<P extends ParserInput | undefined = ParserInput | undefined> =
  ReactiveFields<Omit<RouteStateOptions, 'parser'> & { parser?: P }, 'key' | 'parser'>

export interface BatchOptions {
  history?: HistoryMode
}

type Refs<TOptions extends readonly RouteStateConfig[]> = {
  [TOption in TOptions[number] as TOption['key']]: Ref<
    InferInputValue<TOption['parser']>,
    InferInputWritable<TOption['parser']>
  >
}

type StatePatch<TOptions extends readonly RouteStateConfig[]> = Partial<{
  [TOption in TOptions[number] as TOption['key']]: InferInputWritable<TOption['parser']>
}>

type StateSnapshot<TOptions extends readonly RouteStateConfig[]> = {
  [TOption in TOptions[number] as TOption['key']]: InferInputValue<TOption['parser']>
}

export interface UseRouteStatesApi<TOptions extends readonly RouteStateConfig[]> {
  set: (patch: StatePatch<TOptions>, options?: BatchOptions) => void
  reset: (options?: BatchOptions) => void
  toObject: () => StateSnapshot<TOptions>
}

export type UseRouteStatesReturn<TOptions extends readonly RouteStateConfig[]> = Refs<TOptions> &
  UseRouteStatesApi<TOptions>

function resolveBatchHistory(
  candidates: readonly HistoryMode[],
  override: HistoryMode | undefined,
): HistoryMode {
  if (override) return override
  return candidates.includes('push') ? 'push' : 'replace'
}

export function useRouteStates<const TOptions extends readonly RouteStateConfig[]>(
  configs: TOptions,
): UseRouteStatesReturn<TOptions> {
  if (!getCurrentScope()) warnDev(ErrorCodes.NO_EFFECT_SCOPE, 'useRouteStates')

  const { createRouteStateRef, navigate } = useBaseRouteState()
  const defaults = getActiveWagen().router

  const resolvedList: ComputedRef<ResolvedRouteStateOptions>[] = configs.map(config =>
    computed(() => toResolvedOptions(toValueDeep<RouteStateOptions>(config), defaults)),
  )

  const refs = Object.fromEntries(
    resolvedList.map(resolved => [resolved.value.key, createRouteStateRef(resolved)]),
  ) as Refs<TOptions>

  const api: UseRouteStatesApi<TOptions> = {
    set(patch, options) {
      const changes: RouteChange[] = []
      const historyCandidates: HistoryMode[] = []

      for (const resolved of resolvedList) {
        const { key, urlKey, source, parser, clearOnDefault, history } = resolved.value
        if (!(key in patch)) continue

        const next = (patch as Record<string, unknown>)[key]
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
        const { urlKey, source, parser, clearOnDefault, history } = resolved.value
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
      for (const resolved of resolvedList) {
        const { key } = resolved.value
        snapshot[key] = (refs as Record<string, Ref<any, any>>)[key].value
      }
      return snapshot as StateSnapshot<TOptions>
    },
  }

  return { ...refs, ...api } as UseRouteStatesReturn<TOptions>
}
