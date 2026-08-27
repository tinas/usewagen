export type ErrorHandler = (error: unknown) => void

export type Unsubscribe = () => void

export interface StorageAdapter {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  keys: () => string[]
  watch?: (onChange: (key: string | null) => void) => Unsubscribe
}

export interface StorageConfig {
  prefix?: string
  crossTab?: boolean
  onError?: ErrorHandler
}

export type StorageOptions = StorageAdapter & StorageConfig

export interface StorageInstance {
  readonly name: string
  readonly prefix: string
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  has: (key: string) => boolean
  keys: () => string[]
  clear: (options?: { except?: string[] }) => void
  subscribe: (key: string, listener: () => void) => Unsubscribe
  destroy: () => void
}

export function createStorage(name: string, options: StorageOptions): StorageInstance {
  const { prefix = '', crossTab = false, onError } = options

  const fullKey = (key: string) => prefix + key
  const isOwn = (key: string) => key.startsWith(prefix)
  const listeners = new Map<string, Set<() => void>>()

  function notify(key: string | null): void {
    if (key === null) {
      for (const set of listeners.values()) {
        for (const listener of set) listener()
      }
      return
    }

    const set = listeners.get(key)
    if (!set) return
    for (const listener of set) listener()
  }

  const stopSync = crossTab
    ? options.watch?.(key => {
        if (key === null || isOwn(key)) notify(key)
      })
    : undefined

  return {
    name,
    prefix,
    getItem(key) {
      try {
        return options.getItem(fullKey(key))
      } catch (error) {
        onError?.(error)
        return null
      }
    },
    setItem(key, value) {
      const target = fullKey(key)
      try {
        if (options.getItem(target) === value) return
        options.setItem(target, value)
        notify(target)
      } catch (error) {
        onError?.(error)
        notify(target)
      }
    },
    removeItem(key) {
      const target = fullKey(key)
      try {
        if (options.getItem(target) === null) return
        options.removeItem(target)
        notify(target)
      } catch (error) {
        onError?.(error)
        notify(target)
      }
    },
    has(key) {
      try {
        return options.getItem(fullKey(key)) !== null
      } catch (error) {
        onError?.(error)
        return false
      }
    },
    keys() {
      try {
        return options
          .keys()
          .filter(isOwn)
          .map(key => key.slice(prefix.length))
      } catch (error) {
        onError?.(error)
        return []
      }
    },
    clear(clearOptions) {
      try {
        const except = new Set((clearOptions?.except ?? []).map(fullKey))
        const targets = options.keys().filter(key => isOwn(key) && !except.has(key))
        if (targets.length === 0) return

        for (const target of targets) {
          options.removeItem(target)
          notify(target)
        }
      } catch (error) {
        onError?.(error)
      }
    },
    subscribe(key, listener) {
      const target = fullKey(key)
      let set = listeners.get(target)
      if (!set) {
        set = new Set()
        listeners.set(target, set)
      }
      set.add(listener)

      return () => {
        const current = listeners.get(target)
        if (!current) return
        current.delete(listener)
        if (current.size === 0) listeners.delete(target)
      }
    },
    destroy() {
      stopSync?.()
      listeners.clear()
    },
  }
}
