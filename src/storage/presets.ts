import type { StorageAdapter, StorageConfig, StorageInstance } from './create-storage'

import { createStorage } from './create-storage'
import { ErrorCodes, warn } from '../messages'

function memoryAdapter(): StorageAdapter {
  const store = new Map<string, string>()

  return {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: key => {
      store.delete(key)
    },
    keys: () => [...store.keys()],
  }
}

function noopAdapter(): StorageAdapter {
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    keys: () => [],
  }
}

function webAdapter(name: 'local' | 'session'): StorageAdapter | null {
  let area: Storage
  try {
    area = name === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }

  return {
    getItem: key => area.getItem(key),
    setItem: (key, value) => area.setItem(key, value),
    removeItem: key => area.removeItem(key),
    keys: () => {
      const result: string[] = []
      for (let i = 0; i < area.length; i++) {
        const key = area.key(i)
        if (key !== null) result.push(key)
      }
      return result
    },
    watch(onChange) {
      const handleStorage = (event: StorageEvent) => {
        if (event.storageArea && event.storageArea !== area) return
        if (event.key === null) return onChange(null)
        if (typeof event.key === 'string') onChange(event.key)
      }

      const target = window
      target.addEventListener('storage', handleStorage)

      return () => target.removeEventListener('storage', handleStorage)
    },
  }
}

function createWebStorage(name: 'local' | 'session', config: StorageConfig): StorageInstance {
  if (typeof window === 'undefined') {
    return createStorage(name, { ...noopAdapter(), ...config })
  }

  const adapter = webAdapter(name)
  if (!adapter) {
    warn(ErrorCodes.WEB_STORAGE_UNAVAILABLE, `${name}Storage`)
    return createStorage(name, { ...memoryAdapter(), ...config, crossTab: false })
  }

  return createStorage(name, { ...adapter, ...config })
}

export function createMemoryStorage(config: StorageConfig = {}): StorageInstance {
  return createStorage('memory', { ...memoryAdapter(), ...config })
}

export function createLocalStorage(config: StorageConfig = {}): StorageInstance {
  return createWebStorage('local', { ...config, crossTab: config.crossTab ?? true })
}

export function createSessionStorage(config: StorageConfig = {}): StorageInstance {
  return createWebStorage('session', config)
}
