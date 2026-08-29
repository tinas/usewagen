import type { Ref } from 'vue'
import type { ReactiveOptions } from '../options'
import type { InferInputValue, InferInputWritable, ParserInput } from '../parser/types'
import type { ResolvedRouteStateOptions, RouteStateOptions } from './types'

import { computed, getCurrentScope } from 'vue'
import { ErrorCodes, warnDev } from '../messages'
import { toValueDeep } from '../options'
import { getActiveWagen } from '../wagen'
import { useBaseRouteState } from './use-base-route-state'
import { toResolvedOptions } from './utils'

export type UseRouteStateOptions<P extends ParserInput | undefined = ParserInput | undefined> =
  ReactiveOptions<Omit<RouteStateOptions, 'parser'> & { parser?: P }, 'parser'>

export function useRouteState<P extends ParserInput | undefined = undefined>(
  options: UseRouteStateOptions<P>,
): Ref<InferInputValue<P>, InferInputWritable<P>>

export function useRouteState(options: UseRouteStateOptions) {
  if (!getCurrentScope()) warnDev(ErrorCodes.NO_EFFECT_SCOPE, 'useRouteState')

  const { createRouteStateRef } = useBaseRouteState()
  const defaults = getActiveWagen().router

  const resolvedOptions = computed<ResolvedRouteStateOptions>(() =>
    toResolvedOptions(toValueDeep<RouteStateOptions>(options), defaults),
  )

  return createRouteStateRef(resolvedOptions)
}
