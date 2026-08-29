import type { MaybeRefOrGetter, Ref } from 'vue'
import type { InferInputValue, InferInputWritable, ParserInput } from '../parser/types'
import type { ResolvedRouteStateOptions, RouteStateOptions } from './types'

import { computed, getCurrentScope, toValue } from 'vue'
import { ErrorCodes, warnDev } from '../messages'
import { getActiveWagen } from '../wagen'
import { useBaseRouteState } from './use-base-route-state'
import { toResolvedOptions } from './utils'

export type UseRouteStateOptions = MaybeRefOrGetter<RouteStateOptions>

export function useRouteState<P extends ParserInput | undefined = undefined>(
  options: MaybeRefOrGetter<Omit<RouteStateOptions, 'parser'> & { parser?: P }>,
): Ref<InferInputValue<P>, InferInputWritable<P>>

export function useRouteState(options: UseRouteStateOptions) {
  if (!getCurrentScope()) warnDev(ErrorCodes.NO_EFFECT_SCOPE, 'useRouteState')

  const { createRouteStateRef } = useBaseRouteState()
  const defaults = getActiveWagen().router

  const resolvedOptions = computed<ResolvedRouteStateOptions>(() =>
    toResolvedOptions(toValue(options), defaults),
  )

  return createRouteStateRef(resolvedOptions)
}
