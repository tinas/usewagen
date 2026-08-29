import type { InferInputValue, InferInputWritable, ParserInput } from '../parser/types'
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
}

export interface StorageState<T = string | null, W = T | null | undefined> {
  readonly key: string
  readonly storage: StorageInstance
  get: () => T
  set: (value: W) => void
  remove: () => void
  subscribe: (listener: () => void) => Unsubscribe
}

export function defineStorageState<P extends ParserInput | undefined = undefined>(
  options: Omit<StorageStateOptions, 'parser'> & { parser?: P },
): StorageState<InferInputValue<P>, InferInputWritable<P>>

export function defineStorageState(options: StorageStateOptions): StorageState<any, any> {
  const { key } = options
  const clearOnDefault = options.clearOnDefault ?? true

  const parser = resolveParser(options.parser)

  function storage(): StorageInstance {
    const source = options.storage
    if (source && typeof source !== 'string') return source

    const { storage } = getActiveWagen()
    return source ? storage[source] : storage.default
  }

  return {
    key,
    get storage() {
      return storage()
    },
    get: () => parseValue(parser, storage().getItem(key)),
    set: next => {
      const serialized = serializeValue(parser, clearOnDefault, next)
      if (serialized === null) storage().removeItem(key)
      else storage().setItem(key, serialized)
    },
    remove: () => storage().removeItem(key),
    subscribe: listener => storage().subscribe(key, listener),
  }
}
