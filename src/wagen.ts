import type { App, InjectionKey } from 'vue'
import type { Parser } from './parser/parsers'
import type { HistoryMode, RouteStateSource } from './router/types'
import type { ErrorHandler, StorageInstance } from './storage/create-storage'

import { hasInjectionContext, inject, markRaw } from 'vue'
import { ErrorCodes, warnDev } from './messages'
import { createLocalStorage, createSessionStorage } from './storage/presets'

export interface WagenStorageOptions {
  prefix?: string
  crossTab?: boolean
  onError?: ErrorHandler
  local?: StorageInstance
  session?: StorageInstance
  default?: 'local' | 'session'
}

export interface WagenRouterOptions {
  history?: HistoryMode
  source?: RouteStateSource
  clearOnDefault?: boolean
}

export type WagenParsers = Record<string, Parser<any>>

export interface WagenConfig {
  parsers?: WagenParsers
  storage?: WagenStorageOptions
  router?: WagenRouterOptions
}

export interface WagenStorage {
  readonly local: StorageInstance
  readonly session: StorageInstance
  readonly default: StorageInstance
}

export type ResolvedWagenRouterOptions = Required<WagenRouterOptions>

export interface Wagen {
  readonly parsers: WagenParsers
  readonly storage: WagenStorage
  readonly router: ResolvedWagenRouterOptions
  install: (app: App) => void
  destroy: () => void
}

const WAGEN_KEY = Symbol.for('usewagen') as InjectionKey<Wagen>

const ROUTER_DEFAULTS: ResolvedWagenRouterOptions = {
  history: 'replace',
  source: 'query',
  clearOnDefault: true,
}

let activeWagen: Wagen | null = null

function createStorage(options: WagenStorageOptions) {
  const { prefix, crossTab, onError } = options
  const created: StorageInstance[] = []

  function own(instance: StorageInstance): StorageInstance {
    created.push(instance)
    return instance
  }

  let local: StorageInstance | undefined
  let session: StorageInstance | undefined

  const storage: WagenStorage = {
    get local() {
      local ??= options.local ?? own(createLocalStorage({ prefix, crossTab, onError }))
      return local
    },
    get session() {
      session ??= options.session ?? own(createSessionStorage({ prefix, crossTab, onError }))
      return session
    },
    get default() {
      return options.default === 'session' ? storage.session : storage.local
    },
  }

  function destroy() {
    for (const instance of created) instance.destroy()
    created.length = 0
  }

  return { storage, destroy }
}

export function defineWagenConfig(config: WagenConfig): WagenConfig {
  return config
}

export function createWagen(config: WagenConfig = {}): Wagen {
  const { storage, destroy } = createStorage(config.storage ?? {})

  const wagen: Wagen = markRaw({
    parsers: { ...config.parsers },
    storage,
    router: { ...ROUTER_DEFAULTS, ...config.router },
    install(app) {
      app.provide(WAGEN_KEY, wagen)
      activeWagen = wagen
    },
    destroy() {
      destroy()
      if (activeWagen === wagen) activeWagen = null
    },
  })

  return wagen
}

export function setActiveWagen(wagen: Wagen | null): void {
  activeWagen = wagen
}

export function getActiveWagen(): Wagen {
  const injected = hasInjectionContext() ? inject(WAGEN_KEY, null) : null
  if (injected) return injected

  activeWagen ??= createWagen()
  return activeWagen
}

export function useWagen(): Wagen {
  if (!hasInjectionContext()) warnDev(ErrorCodes.NO_INJECTION_CONTEXT)

  return getActiveWagen()
}
