import type { StorageAdapter } from '../../src/storage/create-storage'

export function objectAdapter(backing: Record<string, string> = {}): StorageAdapter {
  return {
    getItem: key => backing[key] ?? null,
    setItem: (key, value) => {
      backing[key] = value
    },
    removeItem: key => {
      delete backing[key]
    },
    keys: () => Object.keys(backing),
  }
}

export function fakeArea(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
  } as unknown as Storage
}

export function stubWindow(descriptors: PropertyDescriptorMap = {}) {
  const handlers = new Map<string, Set<(event: any) => void>>()
  const win = {
    localStorage: fakeArea(),
    sessionStorage: fakeArea(),
    addEventListener(type: string, handler: (event: any) => void) {
      if (!handlers.has(type)) handlers.set(type, new Set())
      handlers.get(type)!.add(handler)
    },
    removeEventListener(type: string, handler: (event: any) => void) {
      handlers.get(type)?.delete(handler)
    },
  }
  Object.defineProperties(win, descriptors)
  ;(globalThis as any).window = win

  return {
    win,
    listenerCount: (type: string) => handlers.get(type)?.size ?? 0,
    emit: (type: string, event: unknown) => {
      for (const handler of handlers.get(type) ?? []) handler(event)
    },
  }
}

export function restoreWindow() {
  delete (globalThis as any).window
}

export const delay = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms))
