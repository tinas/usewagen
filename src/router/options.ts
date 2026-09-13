import type { RouteHashConfig } from './use-route-hash'
import type { RouteStateConfig } from './use-route-states'

type Exact<T, TShape> = T & Record<Exclude<keyof T, keyof TShape>, never>

export function routeStateOptions<const T extends RouteStateConfig>(
  options: Exact<T, RouteStateConfig>,
): T
export function routeStateOptions<const T extends RouteStateConfig>(
  options: () => Exact<T, RouteStateConfig>,
): () => T

export function routeStateOptions(options: unknown) {
  return options
}

export function routeHashOptions<const T extends RouteHashConfig>(
  options: Exact<T, RouteHashConfig>,
): T
export function routeHashOptions<const T extends RouteHashConfig>(
  options: () => Exact<T, RouteHashConfig>,
): () => T

export function routeHashOptions(options: unknown) {
  return options
}
