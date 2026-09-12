import type { MaybeRefOrGetter } from 'vue'

export type StateMode = 'optimistic' | 'source'

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
