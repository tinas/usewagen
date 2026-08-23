import type { MaybeRefOrGetter, Ref } from 'vue'
import type { ParserInput } from '../parser/types'
import type {
  InferRouteStateInput,
  InferRouteStateValue,
  ResolvedRouteStateOptions,
  RouteStateOptions,
} from './types'

import { computed, toValue } from 'vue'
import { useBaseRouteState } from './use-base-route-state'
import { toResolvedOptions } from './utils'

export type UseRouteStateOptions<P extends ParserInput = ParserInput> = MaybeRefOrGetter<
  RouteStateOptions<P>
>

export function useRouteState<P extends ParserInput>(
  options: UseRouteStateOptions<P>,
): Ref<InferRouteStateValue<P>, InferRouteStateInput<P>>

export function useRouteState(options: UseRouteStateOptions) {
  const { createRouteStateRef } = useBaseRouteState()

  const resolvedOptions = computed<ResolvedRouteStateOptions>(() =>
    toResolvedOptions(toValue(options)),
  )

  return createRouteStateRef(resolvedOptions)
}
