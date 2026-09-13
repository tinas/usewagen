import type { MaybeRefOrGetter } from 'vue'
import type { MaybeRefsOrGetters } from './types'

import { toValue } from 'vue'

export function toValueDeep<T extends object>(input: MaybeRefOrGetter<MaybeRefsOrGetters<T>>): T {
  const source = toValue(input)
  const result = {} as T

  for (const key in source) {
    result[key] = toValue(source[key]) as T[Extract<keyof T, string>]
  }

  return result
}
