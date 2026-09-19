import type { Missing, StateMode } from '../types'
import type { InferInputValue, InferInputWritable, ParserInput, WithParser } from '../parser/types'
import type { StorageInstance, Unsubscribe } from './create-storage'

import { resolveMissing } from '../options'
import { resolveParser } from '../parser/resolve'
import { parseValue, serializeValue } from '../parser/utils'
import { getActiveWagen } from '../wagen'

export type StorageSource = StorageInstance | 'local' | 'session'

export interface StorageStateOptions {
  key: string
  storage?: StorageSource
  parser?: ParserInput
  missing?: unknown
  clearOnDefault?: boolean
  mode?: StateMode
}

export interface StorageState<T = string | Missing, W = T | Missing | undefined> {
  readonly key: string
  readonly storage: StorageInstance
  get: () => T
  set: (value: W) => void
  remove: () => void
  subscribe: (listener: () => void) => Unsubscribe
}

interface ResolvedTarget {
  instance: StorageInstance
  optimistic: boolean
  missing: unknown
}

export function defineStorageState<
  P extends ParserInput | undefined = undefined,
  const M = Missing,
>(
  options: WithParser<StorageStateOptions, P, M>,
): StorageState<InferInputValue<P, M>, InferInputWritable<P, M>>

export function defineStorageState(options: StorageStateOptions): StorageState<any, any> {
  const { key } = options
  const clearOnDefault = options.clearOnDefault ?? true

  const parser = resolveParser(options.parser)

  let cache: { seen: string | null; raw: string | null } | null = null

  function resolved(): ResolvedTarget {
    const wagen = getActiveWagen()
    const source = options.storage
    const instance =
      source === undefined
        ? wagen.storage.default
        : typeof source === 'string'
          ? wagen.storage[source]
          : source

    return {
      instance,
      optimistic: (options.mode ?? wagen.storage.mode) === 'optimistic',
      missing: resolveMissing(options, wagen.missing),
    }
  }

  function write(target: ResolvedTarget, serialized: string | null): void {
    const { instance, optimistic } = target

    if (optimistic) cache = { seen: instance.getItem(key), raw: serialized }

    if (serialized === null) instance.removeItem(key)
    else instance.setItem(key, serialized)

    if (optimistic) cache = { seen: instance.getItem(key), raw: serialized }
  }

  return {
    key,
    get storage() {
      return resolved().instance
    },
    get: () => {
      const { instance, optimistic, missing } = resolved()
      const current = instance.getItem(key)
      const state = { parser, missing }

      if (!optimistic) {
        cache = null
        return parseValue(state, current)
      }

      if (cache && cache.seen === current) return parseValue(state, cache.raw)

      cache = { seen: current, raw: current }
      return parseValue(state, current)
    },
    set: next => {
      const target = resolved()
      write(target, serializeValue({ parser, clearOnDefault, missing: target.missing }, next))
    },
    remove: () => write(resolved(), null),
    subscribe: listener => resolved().instance.subscribe(key, listener),
  }
}
