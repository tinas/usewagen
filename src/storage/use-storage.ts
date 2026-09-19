import type { ComputedRef, Ref } from 'vue'
import type { Missing, ReactiveOptions } from '../types'
import type {
  InferInputValue,
  InferInputWritable,
  ParserInput,
  UnwrapOption,
  WithParser,
} from '../parser/types'
import type { WagenStorage } from '../wagen'
import type { StorageState, StorageStateOptions } from './define-storage-state'

import { computed, customRef, getCurrentScope, onWatcherCleanup, toValue, watch } from 'vue'
import { ErrorCodes, warnDev } from '../messages'
import { resolveMissing, toValueDeep } from '../options'
import { defineStorageState } from './define-storage-state'
import { getActiveWagen } from '../wagen'

export type UseStorageOptions<
  P extends ParserInput | undefined = ParserInput | undefined,
  M = unknown,
> = ReactiveOptions<WithParser<StorageStateOptions, P, M>, 'missing'>

export type UseLocalStorageOptions<
  P extends ParserInput | undefined = ParserInput | undefined,
  M = unknown,
> = ReactiveOptions<WithParser<Omit<StorageStateOptions, 'storage'>, P, M>, 'missing'>

export type UseSessionStorageOptions<
  P extends ParserInput | undefined = ParserInput | undefined,
  M = unknown,
> = UseLocalStorageOptions<P, M>

function isStorageState(input: unknown): input is StorageState<any, any> {
  return typeof input === 'object' && input !== null && typeof (input as any).get === 'function'
}

function withDefaults(
  options: StorageStateOptions,
  defaults: WagenStorage,
  missing: unknown,
): StorageStateOptions {
  const source = options.storage
  const storage =
    source === undefined ? defaults.default : typeof source === 'string' ? defaults[source] : source

  return {
    ...options,
    storage,
    mode: options.mode ?? defaults.mode,
    missing: resolveMissing(options, missing),
  }
}

function useStorageState(
  input: StorageState<any, any> | UseStorageOptions,
): ComputedRef<StorageState<any, any>> {
  if (isStorageState(input)) return computed(() => input)

  const { storage, missing } = getActiveWagen()
  return computed(() =>
    defineStorageState(withDefaults(toValueDeep<StorageStateOptions>(input), storage, missing)),
  )
}

type NotStorageState = { get?: never }

export function useStorage<P extends ParserInput | undefined = undefined, const M = Missing>(
  options: UseStorageOptions<P, M> & NotStorageState,
): Ref<InferInputValue<P, UnwrapOption<M>>, InferInputWritable<P, UnwrapOption<M>>>
export function useStorage<T, W>(state: StorageState<T, W>): Ref<T, W>

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

export function useLocalStorage<P extends ParserInput | undefined = undefined, const M = Missing>(
  options: UseLocalStorageOptions<P, M>,
): Ref<InferInputValue<P, UnwrapOption<M>>, InferInputWritable<P, UnwrapOption<M>>>

export function useLocalStorage(options: UseLocalStorageOptions) {
  return useStorage(() => ({ ...toValue(options), storage: 'local' as const }))
}

export function useSessionStorage<P extends ParserInput | undefined = undefined, const M = Missing>(
  options: UseSessionStorageOptions<P, M>,
): Ref<InferInputValue<P, UnwrapOption<M>>, InferInputWritable<P, UnwrapOption<M>>>

export function useSessionStorage(options: UseSessionStorageOptions) {
  return useStorage(() => ({ ...toValue(options), storage: 'session' as const }))
}
