import type { Ref } from 'vue'
import type { Missing, ReactiveOptions } from '../types'
import type {
  InferInputValue,
  InferInputWritable,
  ParserInput,
  UnwrapOption,
  WithParser,
} from '../parser/types'
import type { ResolvedRouteStateOptions, RouteStateOptions } from './types'

import { computed, getCurrentScope } from 'vue'
import { ErrorCodes, warnDev } from '../messages'
import { toValueDeep } from '../options'
import { getActiveWagen } from '../wagen'
import { useBaseRouteState } from './use-base-route-state'
import { toResolvedOptions } from './utils'

export type UseRouteStateOptions<
  P extends ParserInput | undefined = ParserInput | undefined,
  M = unknown,
> = ReactiveOptions<WithParser<RouteStateOptions, P, M>, 'missing'>

export function useRouteState<P extends ParserInput | undefined = undefined, const M = Missing>(
  options: UseRouteStateOptions<P, M>,
): Ref<InferInputValue<P, UnwrapOption<M>>, InferInputWritable<P, UnwrapOption<M>>>

export function useRouteState(options: UseRouteStateOptions) {
  if (!getCurrentScope()) warnDev(ErrorCodes.NO_EFFECT_SCOPE, 'useRouteState')

  const { createRouteStateRef } = useBaseRouteState()
  const { router: defaults, missing } = getActiveWagen()

  const resolvedOptions = computed<ResolvedRouteStateOptions>(() =>
    toResolvedOptions(toValueDeep<RouteStateOptions>(options), defaults, missing),
  )

  return createRouteStateRef(resolvedOptions).state
}
