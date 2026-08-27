import type { App } from 'vue'

import { afterEach, beforeEach, describe, expect, expectTypeOf, test } from 'vite-plus/test'
import { createApp } from 'vue'

import {
  createWagenStorage,
  getActiveStorage,
  setActiveStorage,
  useWagenStorage,
} from '../../src/storage/plugin'
import { defineStorageState } from '../../src/storage/define-storage-state'
import { createMemoryStorage } from '../../src/storage/presets'
import { useLocalStorage, useSessionStorage, useStorage } from '../../src/storage/use-storage'

let app: App
let wagen: ReturnType<typeof createWagenStorage>

function run<T>(fn: () => T): T {
  return app.runWithContext(fn) as T
}

function memoryWagen() {
  return createWagenStorage({
    local: createMemoryStorage({ prefix: 'app:' }),
    session: createMemoryStorage({ prefix: 'app:' }),
  })
}

beforeEach(() => {
  wagen = memoryWagen()
  app = createApp({ render: () => null })
  app.use(wagen)
})

afterEach(() => {
  setActiveStorage(null)
})

describe('createWagenStorage', () => {
  test('provides the local and session storages', () => {
    const injected = run(() => useWagenStorage())

    expect(injected).toBe(wagen)
    expect(injected.local.prefix).toBe('app:')
  })

  test('the default storage is the local one unless configured', () => {
    expect(wagen.default).toBe(wagen.local)
  })

  test('defaultStorage points it at the session storage', () => {
    const configured = createWagenStorage({
      local: createMemoryStorage({ prefix: 'app:' }),
      session: createMemoryStorage({ prefix: 'app:' }),
      defaultStorage: 'session',
    })

    expect(configured.default).toBe(configured.session)
  })

  test('useStorage without a storage follows the plugin default', () => {
    const configured = createWagenStorage({
      local: createMemoryStorage({ prefix: 'app:' }),
      session: createMemoryStorage({ prefix: 'app:' }),
      defaultStorage: 'session',
    })
    const scoped = createApp({ render: () => null })
    scoped.use(configured)

    const draft = scoped.runWithContext(() => useStorage({ key: 'draft' }))
    draft.value = 'hello'

    expect(configured.session.getItem('draft')).toBe('hello')
    expect(configured.local.has('draft')).toBe(false)
  })

  test('useLocalStorage and useSessionStorage target different storages', () => {
    const local = run(() => useLocalStorage({ key: 'theme' }))
    const session = run(() => useSessionStorage({ key: 'theme' }))

    local.value = 'dark'
    session.value = 'light'

    expect(wagen.local.getItem('theme')).toBe('dark')
    expect(wagen.session.getItem('theme')).toBe('light')
  })

  test('a storage outside the plugin goes through useStorage', () => {
    const storage = createMemoryStorage({ prefix: 'analytics:' })
    const state = useStorage({ key: 'seen', storage })

    state.value = 'yes'

    expect(storage.getItem('seen')).toBe('yes')
    expect(wagen.local.has('seen')).toBe(false)
  })

  test('creating the plugin on the server does not crash', () => {
    const ssr = createWagenStorage()

    ssr.local.setItem('theme', 'dark')

    expect(ssr.local.getItem('theme')).toBe(null)
    ssr.destroy()
  })

  test('destroy tears down both storages', () => {
    let calls = 0
    wagen.local.subscribe('theme', () => calls++)

    wagen.destroy()
    wagen.local.setItem('theme', 'dark')

    expect(calls).toBe(0)
  })
})

describe('the active instance', () => {
  test('install registers it, so setup is not required', () => {
    expect(getActiveStorage()).toBe(wagen)

    const theme = useLocalStorage({ key: 'theme' })
    theme.value = 'dark'

    expect(wagen.local.getItem('theme')).toBe('dark')
  })

  test('creating without installing leaves it untouched', () => {
    setActiveStorage(null)
    createWagenStorage()

    expect(getActiveStorage()).toBeNull()
  })

  test('injection wins over it', () => {
    const other = memoryWagen()
    const otherApp = createApp({ render: () => null })
    otherApp.use(other)

    expect(getActiveStorage()).toBe(other)
    expect(run(() => useWagenStorage())).toBe(wagen)
  })

  test('the last installed plugin becomes the active one', () => {
    const other = memoryWagen()
    createApp({ render: () => null }).use(other)

    expect(useWagenStorage()).toBe(other)
  })

  test('destroy clears it only when it is the active one', () => {
    const other = memoryWagen()
    createApp({ render: () => null }).use(other)

    wagen.destroy()
    expect(getActiveStorage()).toBe(other)

    other.destroy()
    expect(getActiveStorage()).toBeNull()
  })

  test('a state defined outside setup follows it, not the surrounding app', () => {
    const other = memoryWagen()
    createApp({ render: () => null }).use(other)

    const theme = defineStorageState({ key: 'theme' })
    run(() => theme.set('dark'))

    expect(other.local.getItem('theme')).toBe('dark')
    expect(wagen.local.has('theme')).toBe(false)
  })

  test('useStorage in setup takes the injected instance over it', () => {
    const other = memoryWagen()
    createApp({ render: () => null }).use(other)

    const theme = run(() => useLocalStorage({ key: 'theme' }))
    theme.value = 'dark'

    expect(wagen.local.getItem('theme')).toBe('dark')
    expect(other.local.has('theme')).toBe(false)
  })

  test('throws a helpful error without injection or an active instance', () => {
    setActiveStorage(null)

    expect(() => useWagenStorage()).toThrow(/no storage instance found/)
    expect(() => useLocalStorage({ key: 'theme' })).toThrow(/no storage instance found/)
  })
})

describe('useLocalStorage type inference', () => {
  test('falls back to the default parser when none is given', () => {
    const theme = run(() => useLocalStorage({ key: 'theme' }))

    expectTypeOf(theme.value).toEqualTypeOf<string | null>()
    expect(theme.value).toBeNull()
  })

  test('useSessionStorage infers the same way', () => {
    const draft = run(() => useSessionStorage({ key: 'draft' }))

    expectTypeOf(draft.value).toEqualTypeOf<string | null>()
  })
})
