import type { ComputedRef, Ref } from 'vue'
import type { ReactiveOptions } from '../options'
import type { InferInputValue, InferInputWritable, ParserInput } from '../parser/types'
import type { Wagen } from '../wagen'
import type { StorageState, StorageStateOptions } from './define-storage-state'

import { computed, customRef, getCurrentScope, onWatcherCleanup, toValue, watch } from 'vue'
import { ErrorCodes, warnDev } from '../messages'
import { toValueDeep } from '../options'
import { defineStorageState } from './define-storage-state'
import { getActiveWagen } from '../wagen'

export type UseStorageOptions<P extends ParserInput | undefined = ParserInput | undefined> =
  ReactiveOptions<Omit<StorageStateOptions, 'parser'> & { parser?: P }, 'parser'>

export type UseLocalStorageOptions<P extends ParserInput | undefined = ParserInput | undefined> =
  ReactiveOptions<Omit<StorageStateOptions, 'parser' | 'storage'> & { parser?: P }, 'parser'>

export type UseSessionStorageOptions<P extends ParserInput | undefined = ParserInput | undefined> =
  UseLocalStorageOptions<P>

function isStorageState(input: unknown): input is StorageState<any, any> {
  return typeof input === 'object' && input !== null && typeof (input as any).get === 'function'
}

function withResolvedStorage(options: StorageStateOptions, wagen: Wagen): StorageStateOptions {
  const source = options.storage
  if (source && typeof source !== 'string') return options

  return { ...options, storage: source ? wagen.storage[source] : wagen.storage.default }
}

function useStorageState(
  input: StorageState<any, any> | UseStorageOptions,
): ComputedRef<StorageState<any, any>> {
  if (isStorageState(input)) return computed(() => input)

  const wagen = getActiveWagen()
  return computed(() =>
    defineStorageState(withResolvedStorage(toValueDeep<StorageStateOptions>(input), wagen)),
  )
}

export function useStorage<T, W>(state: StorageState<T, W>): Ref<T, W>
export function useStorage<P extends ParserInput | undefined = undefined>(
  options: UseStorageOptions<P>,
): Ref<InferInputValue<P>, InferInputWritable<P>>

export function useStorage(input: StorageState<any, any> | UseStorageOptions): Ref<any, any> {
  if (!getCurrentScope()) warnDev(ErrorCodes.NO_EFFECT_SCOPE, 'useStorage')

  const state = useStorageState(input)

  let notify!: () => void
  const value = customRef((track, trigger) => {
    notify = trigger

    return {
      get: () => {
        track()
        return state.value.get()
      },
      set: next => state.value.set(next),
    }
  })

  watch(
    state,
    current => {
      onWatcherCleanup(current.subscribe(notify))
    },
    { immediate: true, flush: 'sync' },
  )

  return value
}

export function useLocalStorage<P extends ParserInput | undefined = undefined>(
  options: UseLocalStorageOptions<P>,
): Ref<InferInputValue<P>, InferInputWritable<P>>

export function useLocalStorage(options: UseLocalStorageOptions) {
  return useStorage(() => ({ ...toValue(options), storage: 'local' as const }))
}

export function useSessionStorage<P extends ParserInput | undefined = undefined>(
  options: UseSessionStorageOptions<P>,
): Ref<InferInputValue<P>, InferInputWritable<P>>

export function useSessionStorage(options: UseSessionStorageOptions) {
  return useStorage(() => ({ ...toValue(options), storage: 'session' as const }))
}
