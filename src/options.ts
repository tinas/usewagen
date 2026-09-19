import type { ReactiveOptions } from './types'

import { toValue } from 'vue'

export function toValueDeep<T extends object>(input: ReactiveOptions<T>): T {
  const source = toValue(input)
  const result = {} as T

  for (const key in source) {
    result[key] = toValue(source[key]) as T[Extract<keyof T, string>]
  }

  return result
}

export function resolveMissing(options: { missing?: unknown }, fallback: unknown): unknown {
  return 'missing' in options ? options.missing : fallback
}
