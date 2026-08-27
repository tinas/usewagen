import type { MaybeRefOrGetter, Ref } from 'vue'
import type { InferInputValue, InferInputWritable, ParserInput } from '../parser/types'
import type { ResolvedRouteStateOptions, RouteStateOptions } from './types'

import { computed, toValue } from 'vue'
import { useBaseRouteState } from './use-base-route-state'
import { toResolvedOptions } from './utils'

export type UseRouteStateOptions = MaybeRefOrGetter<RouteStateOptions>

export function useRouteState<P extends ParserInput | undefined = undefined>(
  options: MaybeRefOrGetter<Omit<RouteStateOptions, 'parser'> & { parser?: P }>,
): Ref<InferInputValue<P>, InferInputWritable<P>>

export function useRouteState(options: UseRouteStateOptions) {
  const { createRouteStateRef } = useBaseRouteState()

  const resolvedOptions = computed<ResolvedRouteStateOptions>(() =>
    toResolvedOptions(toValue(options)),
  )

  return createRouteStateRef(resolvedOptions)
}
