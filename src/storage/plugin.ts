import type { App, InjectionKey } from 'vue'
import type { ErrorHandler, StorageInstance } from './create-storage'

import { hasInjectionContext, inject } from 'vue'
import { ErrorCodes, getMessage } from '../messages'
import { createLocalStorage, createSessionStorage } from './presets'

export interface WagenStorageOptions {
  prefix?: string
  crossTab?: boolean
  onError?: ErrorHandler
  local?: StorageInstance
  session?: StorageInstance
  defaultStorage?: 'local' | 'session'
}

export interface WagenStorage {
  local: StorageInstance
  session: StorageInstance
  default: StorageInstance
  install: (app: App) => void
  destroy: () => void
}

export const STORAGE_KEY = Symbol.for('usewagen/storage') as InjectionKey<WagenStorage>

let activeStorage: WagenStorage | null = null

export function setActiveStorage(storage: WagenStorage | null): void {
  activeStorage = storage
}

export function getActiveStorage(): WagenStorage | null {
  return activeStorage
}

export function createWagenStorage(options: WagenStorageOptions = {}): WagenStorage {
  const { prefix, crossTab, onError } = options

  const local = options.local ?? createLocalStorage({ prefix, crossTab, onError })
  const session = options.session ?? createSessionStorage({ prefix, crossTab, onError })

  const storage: WagenStorage = {
    local,
    session,
    default: options.defaultStorage === 'session' ? session : local,
    install(app) {
      app.provide(STORAGE_KEY, storage)
      setActiveStorage(storage)
    },
    destroy() {
      local.destroy()
      session.destroy()
      if (activeStorage === storage) setActiveStorage(null)
    },
  }

  return storage
}

export function useWagenStorage(): WagenStorage {
  const injected = hasInjectionContext() ? inject(STORAGE_KEY, null) : null
  const storage = injected ?? activeStorage

  if (!storage) throw new Error(getMessage(ErrorCodes.NO_STORAGE))

  return storage
}
