import type { ComputedRef, Ref } from 'vue'
import type { Missing, ReactiveFields } from '../types'
import type {
  InferInputValue,
  InferInputWritable,
  ParserInput,
  UnwrapOption,
  WithParser,
} from '../parser/types'
import type { HistoryMode, ResolvedRouteStateOptions, RouteStateOptions } from './types'
import type { RouteStateHandle } from './use-base-route-state'

import { computed, getCurrentScope } from 'vue'
import { ErrorCodes, warnDev } from '../messages'
import { toValueDeep } from '../options'
import { unwrapDefault } from '../parser'
import { getActiveWagen } from '../wagen'
import { serializeValue } from '../parser/utils'
import { resolveBatchHistory } from './queue'
import { useBaseRouteState } from './use-base-route-state'
import { toResolvedOptions } from './utils'

export type RouteStateConfig<
  P extends ParserInput | undefined = ParserInput | undefined,
  M = unknown,
> = ReactiveFields<WithParser<RouteStateOptions, P, M>, 'key' | 'missing'>

export interface BatchOptions {
  history?: HistoryMode
}

type ConfigMissing<TConfig> = 'missing' extends keyof TConfig
  ? UnwrapOption<TConfig['missing']>
  : Missing

type Refs<TOptions extends readonly RouteStateConfig[]> = {
  [TOption in TOptions[number] as TOption['key']]: Ref<
    InferInputValue<TOption['parser'], ConfigMissing<TOption>>,
    InferInputWritable<TOption['parser'], ConfigMissing<TOption>>
  >
}

type StatePatch<TOptions extends readonly RouteStateConfig[]> = Partial<{
  [TOption in TOptions[number] as TOption['key']]: InferInputWritable<
    TOption['parser'],
    ConfigMissing<TOption>
  >
}>

type StateSnapshot<TOptions extends readonly RouteStateConfig[]> = {
  [TOption in TOptions[number] as TOption['key']]: InferInputValue<
    TOption['parser'],
    ConfigMissing<TOption>
  >
}

export interface UseRouteStatesApi<TOptions extends readonly RouteStateConfig[]> {
  set: (patch: StatePatch<TOptions>, options?: BatchOptions) => void
  reset: (options?: BatchOptions) => void
  toObject: () => StateSnapshot<TOptions>
}

export type UseRouteStatesReturn<TOptions extends readonly RouteStateConfig[]> = Refs<TOptions> &
  UseRouteStatesApi<TOptions>

export function useRouteStates<const TOptions extends readonly RouteStateConfig[]>(
  configs: TOptions,
): UseRouteStatesReturn<TOptions> {
  if (!getCurrentScope()) warnDev(ErrorCodes.NO_EFFECT_SCOPE, 'useRouteStates')

  const { createRouteStateRef } = useBaseRouteState()
  const { router: defaults, missing } = getActiveWagen()

  const resolvedList: ComputedRef<ResolvedRouteStateOptions>[] = configs.map(config =>
    computed(() => toResolvedOptions(toValueDeep<RouteStateOptions>(config), defaults, missing)),
  )

  const handles: RouteStateHandle[] = resolvedList.map(resolved => createRouteStateRef(resolved))

  const refs = Object.fromEntries(
    resolvedList.map((resolved, index) => [resolved.value.key, handles[index].state]),
  ) as Refs<TOptions>

  function commit(
    writes: { handle: RouteStateHandle; serialized: string | null }[],
    candidates: HistoryMode[],
    override: HistoryMode | undefined,
  ): void {
    if (writes.length === 0) return

    const history = resolveBatchHistory(candidates, override)
    for (const { handle, serialized } of writes) void handle.write(serialized, history)
  }

  const api: UseRouteStatesApi<TOptions> = {
    set(patch, options) {
      const writes: { handle: RouteStateHandle; serialized: string | null }[] = []
      const candidates: HistoryMode[] = []

      resolvedList.forEach((resolved, index) => {
        const { key, history } = resolved.value
        if (!(key in patch)) return

        const next = (patch as Record<string, unknown>)[key]
        writes.push({ handle: handles[index], serialized: serializeValue(resolved.value, next) })
        candidates.push(history)
      })

      commit(writes, candidates, options?.history)
    },
    reset(options) {
      const writes: { handle: RouteStateHandle; serialized: string | null }[] = []
      const candidates: HistoryMode[] = []

      resolvedList.forEach((resolved, index) => {
        const { parser, history } = resolved.value
        const next = parser.defaultValue !== undefined ? unwrapDefault(parser.defaultValue) : null
        writes.push({ handle: handles[index], serialized: serializeValue(resolved.value, next) })
        candidates.push(history)
      })

      commit(writes, candidates, options?.history)
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
