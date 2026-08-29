import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { createApp } from 'vue'

import { defineParser } from '../src/parser/parsers'
import { defineStorageState } from '../src/storage/define-storage-state'
import { createMemoryStorage } from '../src/storage/presets'
import { useLocalStorage, useStorage } from '../src/storage/use-storage'
import { createWagen, defineWagenConfig, getActiveWagen, useWagen } from '../src/wagen'
import { ErrorCodes, getMessage } from '../src/messages'
import { createMemoryWagen, installWagen, resetWagen } from './__helpers__/wagen'

afterEach(() => {
  resetWagen()
  vi.restoreAllMocks()
})

describe('createWagen', () => {
  test('fills in the router defaults', () => {
    const wagen = createMemoryWagen()

    expect(wagen.router).toEqual({ history: 'replace', source: 'query', clearOnDefault: true })
  })

  test('explicit router options override the defaults one by one', () => {
    const wagen = createMemoryWagen({ router: { history: 'push' } })

    expect(wagen.router).toEqual({ history: 'push', source: 'query', clearOnDefault: true })
  })

  test('copies the parser table instead of holding the caller object', () => {
    const parsers = { parseAsMoney: defineParser({ parse: Number, serialize: String }) }
    const wagen = createWagen({ parsers })

    delete (parsers as Record<string, unknown>).parseAsMoney

    expect(wagen.parsers.parseAsMoney).toBeDefined()
  })

  test('the default storage is the local one unless configured', () => {
    const wagen = createMemoryWagen()

    expect(wagen.storage.default).toBe(wagen.storage.local)
  })

  test('storage.default points at the session storage when configured', () => {
    const wagen = createMemoryWagen({ storage: { default: 'session' } })

    expect(wagen.storage.default).toBe(wagen.storage.session)
  })

  test('builds its storages lazily', () => {
    const wagen = createWagen({ storage: { prefix: 'app:' } })

    expect(wagen.storage.local).toBe(wagen.storage.local)
    expect(wagen.storage.local.prefix).toBe('app:')
  })

  test('creating it on the server does not crash', () => {
    const ssr = createWagen()

    ssr.storage.local.setItem('theme', 'dark')

    expect(ssr.storage.local.getItem('theme')).toBeNull()
    ssr.destroy()
  })
})

describe('defineWagenConfig', () => {
  test('returns the config untouched', () => {
    const config = { router: { history: 'push' } } as const

    expect(defineWagenConfig(config)).toBe(config)
  })
})

describe('destroy', () => {
  test('tears down the storages it created', () => {
    const wagen = createWagen({ storage: { prefix: 'app:' } })
    let calls = 0
    wagen.storage.local.subscribe('theme', () => calls++)

    wagen.destroy()
    wagen.storage.local.setItem('theme', 'dark')

    expect(calls).toBe(0)
  })

  test('leaves storages it did not create alone', () => {
    const local = createMemoryStorage()
    const wagen = createWagen({ storage: { local } })
    let calls = 0
    local.subscribe('theme', () => calls++)

    wagen.destroy()
    local.setItem('theme', 'dark')

    expect(calls).toBe(1)
  })

  test('does not resurrect the listeners on the next access', () => {
    const wagen = createWagen({ storage: { prefix: 'app:' } })
    const before = wagen.storage.local

    wagen.destroy()

    expect(wagen.storage.local).toBe(before)
  })

  test('clears the active instance only when it is the active one', () => {
    const { wagen } = installWagen()
    const other = createMemoryWagen()
    createApp({ render: () => null }).use(other)

    wagen.destroy()
    expect(getActiveWagen()).toBe(other)

    other.destroy()
    expect(getActiveWagen()).not.toBe(other)
  })
})

describe('getActiveWagen', () => {
  test('install makes it the active instance', () => {
    const { wagen } = installWagen()

    expect(getActiveWagen()).toBe(wagen)
  })

  test('the last installed instance wins', () => {
    installWagen()
    const other = createMemoryWagen()
    createApp({ render: () => null }).use(other)

    expect(getActiveWagen()).toBe(other)
  })

  test('creating without installing leaves the active instance untouched', () => {
    const { wagen } = installWagen()
    createMemoryWagen()

    expect(getActiveWagen()).toBe(wagen)
  })

  test('falls back to an implicit instance when nothing is installed', () => {
    const wagen = getActiveWagen()

    expect(wagen.router.history).toBe('replace')
    expect(getActiveWagen()).toBe(wagen)
  })

  test('injection wins over the active instance', () => {
    const { wagen, app } = installWagen()
    const other = createMemoryWagen()
    createApp({ render: () => null }).use(other)

    expect(getActiveWagen()).toBe(other)
    expect(app.runWithContext(() => getActiveWagen())).toBe(wagen)
  })

  test('stays quiet outside an injection context', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    getActiveWagen()

    expect(spy).not.toHaveBeenCalled()
  })
})

describe('useWagen', () => {
  test('returns the injected instance', () => {
    const { wagen, app } = installWagen()

    expect(app.runWithContext(() => useWagen())).toBe(wagen)
  })

  test('warns outside an injection context but still resolves', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { wagen } = installWagen()

    expect(useWagen()).toBe(wagen)
    expect(spy).toHaveBeenCalledWith(getMessage(ErrorCodes.NO_INJECTION_CONTEXT))
  })
})

describe('the instance behind the composables', () => {
  test('a state defined outside setup follows the active instance', () => {
    const { wagen } = installWagen()

    const theme = defineStorageState({ key: 'theme' })
    theme.set('dark')

    expect(wagen.storage.local.getItem('theme')).toBe('dark')
  })

  test('a state re-resolves instead of sticking to the instance it first saw', () => {
    const first = installWagen().wagen
    const theme = defineStorageState({ key: 'theme' })

    theme.set('dark')
    expect(first.storage.local.getItem('theme')).toBe('dark')

    const second = installWagen().wagen
    theme.set('light')

    expect(second.storage.local.getItem('theme')).toBe('light')
    expect(first.storage.local.getItem('theme')).toBe('dark')
  })

  test('useStorage in setup takes the injected instance over the active one', () => {
    const { wagen, run } = installWagen()
    const other = createMemoryWagen()
    createApp({ render: () => null }).use(other)

    const theme = run(() => useLocalStorage({ key: 'theme' }))
    theme.value = 'dark'

    expect(wagen.storage.local.getItem('theme')).toBe('dark')
    expect(other.storage.local.has('theme')).toBe(false)
  })

  test('useStorage without a storage follows the configured default', () => {
    const { wagen, run } = installWagen({ storage: { default: 'session' } })

    const draft = run(() => useStorage({ key: 'draft' }))
    draft.value = 'hello'

    expect(wagen.storage.session.getItem('draft')).toBe('hello')
    expect(wagen.storage.local.has('draft')).toBe(false)
  })

  test('useStorage warns when it is called outside an effect scope', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { app } = installWagen()

    app.runWithContext(() => useStorage({ key: 'theme' }))

    expect(spy).toHaveBeenCalledWith(getMessage(ErrorCodes.NO_EFFECT_SCOPE), 'useStorage')
  })
})
