import type { ComputedRef, MaybeRef, MaybeRefOrGetter } from 'vue'

export type StateMode = 'optimistic' | 'source'

export interface Register {}

type Registered<K extends string, TFallback> = K extends keyof Register ? Register[K] : TFallback

export type Missing = Registered<'missing', null>

export type MaybeRefOrComputed<T> = MaybeRef<T> | ComputedRef<T>

export type ReactiveFields<T, TRaw extends keyof T = never> = {
  [K in keyof T]: K extends TRaw
    ? T[K]
    : K extends 'parser'
      ? MaybeRefOrComputed<T[K]>
      : MaybeRefOrGetter<T[K]>
}

export type ReactiveOptions<T, TRaw extends keyof T = never> = MaybeRefOrGetter<
  ReactiveFields<T, TRaw>
>
