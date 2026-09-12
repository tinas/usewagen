import type { StateMode } from '../types'
import type { InferInputValue, InferInputWritable, ParserInput, WithParser } from '../parser/types'
import type { StorageInstance, Unsubscribe } from './create-storage'

import { resolveParser } from '../parser/resolve'
import { parseValue, serializeValue } from '../parser/utils'
import { getActiveWagen } from '../wagen'

export type StorageSource = StorageInstance | 'local' | 'session'

export interface StorageStateOptions {
  key: string
  storage?: StorageSource
  parser?: ParserInput
  clearOnDefault?: boolean
  mode?: StateMode
}

export interface StorageState<T = string | null, W = T | null | undefined> {
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
}

export function defineStorageState<P extends ParserInput | undefined = undefined>(
  options: WithParser<StorageStateOptions, P>,
): StorageState<InferInputValue<P>, InferInputWritable<P>>

export function defineStorageState(options: StorageStateOptions): StorageState<any, any> {
  const { key } = options
  const clearOnDefault = options.clearOnDefault ?? true

  const parser = resolveParser(options.parser)

  let cache: { seen: string | null; raw: string | null } | null = null

  function resolved(): ResolvedTarget {
    const source = options.storage
    const mode = options.mode

    if (mode !== undefined && source !== undefined && typeof source !== 'string') {
      return { instance: source, optimistic: mode === 'optimistic' }
    }

    const wagen = getActiveWagen()
    const instance =
      source === undefined
        ? wagen.storage.default
        : typeof source === 'string'
          ? wagen.storage[source]
          : source

    return { instance, optimistic: (mode ?? wagen.storage.mode) === 'optimistic' }
  }

  function write(serialized: string | null): void {
    const { instance, optimistic } = resolved()

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
      const { instance, optimistic } = resolved()
      const current = instance.getItem(key)

      if (!optimistic) {
        cache = null
        return parseValue(parser, current)
      }

      if (cache && cache.seen === current) return parseValue(parser, cache.raw)

      cache = { seen: current, raw: current }
      return parseValue(parser, current)
    },
    set: next => write(serializeValue(parser, clearOnDefault, next)),
    remove: () => write(null),
    subscribe: listener => resolved().instance.subscribe(key, listener),
  }
}
