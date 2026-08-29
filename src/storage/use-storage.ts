import type { Ref } from 'vue'
import type { InferInputValue, InferInputWritable, ParserInput } from '../parser/types'
import type { StorageState, StorageStateOptions } from './define-storage-state'

import { customRef, getCurrentScope, onScopeDispose } from 'vue'
import { ErrorCodes, warnDev } from '../messages'
import { defineStorageState } from './define-storage-state'
import { getActiveWagen } from '../wagen'

export type UseLocalStorageOptions = Omit<StorageStateOptions, 'storage'>

export type UseSessionStorageOptions = UseLocalStorageOptions

function isStorageState(input: object): input is StorageState<any, any> {
  return typeof (input as StorageState<any, any>).get === 'function'
}

function withResolvedStorage(options: StorageStateOptions): StorageStateOptions {
  const source = options.storage
  if (source && typeof source !== 'string') return options

  const { storage } = getActiveWagen()
  return { ...options, storage: source ? storage[source] : storage.default }
}

export function useStorage<T, W>(state: StorageState<T, W>): Ref<T, W>
export function useStorage<P extends ParserInput | undefined = undefined>(
  options: Omit<StorageStateOptions, 'parser'> & { parser?: P },
): Ref<InferInputValue<P>, InferInputWritable<P>>

export function useStorage(input: StorageState<any, any> | StorageStateOptions): Ref<any, any> {
  if (!getCurrentScope()) warnDev(ErrorCodes.NO_EFFECT_SCOPE, 'useStorage')

  const state = isStorageState(input) ? input : defineStorageState(withResolvedStorage(input))

  return customRef((track, trigger) => {
    const unsubscribe = state.subscribe(trigger)
    if (getCurrentScope()) onScopeDispose(unsubscribe)

    return {
      get: () => {
        track()
        return state.get()
      },
      set: next => state.set(next),
    }
  })
}

export function useLocalStorage<P extends ParserInput | undefined = undefined>(
  options: Omit<UseLocalStorageOptions, 'parser'> & { parser?: P },
): Ref<InferInputValue<P>, InferInputWritable<P>>

export function useLocalStorage(options: UseLocalStorageOptions) {
  return useStorage({ ...options, storage: 'local' })
}

export function useSessionStorage<P extends ParserInput | undefined = undefined>(
  options: Omit<UseSessionStorageOptions, 'parser'> & { parser?: P },
): Ref<InferInputValue<P>, InferInputWritable<P>>

export function useSessionStorage(options: UseSessionStorageOptions) {
  return useStorage({ ...options, storage: 'session' })
}
