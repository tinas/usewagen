import type { App } from 'vue'
import type { Wagen, WagenConfig } from '../../src/wagen'

import { createApp, effectScope } from 'vue'

import { createMemoryStorage } from '../../src/storage/presets'
import { createWagen, setActiveWagen } from '../../src/wagen'

export interface WagenHarness {
  readonly wagen: Wagen
  readonly app: App
  run: <T>(fn: () => T) => T
}

export function memoryConfig(config: WagenConfig = {}): WagenConfig {
  return {
    ...config,
    storage: {
      local: createMemoryStorage({ prefix: 'app:' }),
      session: createMemoryStorage({ prefix: 'app:' }),
      ...config.storage,
    },
  }
}

export function createMemoryWagen(config: WagenConfig = {}): Wagen {
  return createWagen(memoryConfig(config))
}

export function installWagen(config: WagenConfig = {}): WagenHarness {
  const wagen = createMemoryWagen(config)
  const app = createApp({ render: () => null })
  app.use(wagen)

  return { wagen, app, run: fn => runScoped(app, fn) }
}

export function runScoped<T>(app: App, fn: () => T): T {
  return app.runWithContext(() => effectScope().run(fn)) as T
}

export function resetWagen(): void {
  setActiveWagen(null)
}
