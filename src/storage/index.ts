export type {
  ErrorHandler,
  StorageAdapter,
  StorageConfig,
  StorageInstance,
  StorageOptions,
  Unsubscribe,
} from './create-storage'
export { createStorage } from './create-storage'

export type { StorageSource, StorageState, StorageStateOptions } from './define-storage-state'
export { defineStorageState } from './define-storage-state'

export { createLocalStorage, createMemoryStorage, createSessionStorage } from './presets'

export type { UseLocalStorageOptions, UseSessionStorageOptions } from './use-storage'
export { useLocalStorage, useSessionStorage, useStorage } from './use-storage'
