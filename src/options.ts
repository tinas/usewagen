import type { MaybeRefOrGetter } from 'vue'

import { toValue } from 'vue'

export type MaybeRefsOrGetters<T> = {
  [K in keyof T]: MaybeRefOrGetter<T[K]>
}

export type ReactiveFields<T, TStatic extends keyof T = never> = MaybeRefsOrGetters<
  Omit<T, TStatic>
> &
  Pick<T, TStatic>

export type ReactiveOptions<T, TStatic extends keyof T = never> = MaybeRefOrGetter<
  ReactiveFields<T, TStatic>
>

export function toValueDeep<T extends object>(input: MaybeRefOrGetter<MaybeRefsOrGetters<T>>): T {
  const source = toValue(input)
  const result = {} as T

  for (const key in source) {
    result[key] = toValue(source[key]) as T[Extract<keyof T, string>]
  }

  return result
}
