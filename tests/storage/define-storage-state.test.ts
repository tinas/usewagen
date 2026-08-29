import { afterEach, describe, expect, test } from 'vite-plus/test'

import { parseAsInteger, parseAsJson } from '../../src/parser/parsers'
import { defineStorageState } from '../../src/storage/define-storage-state'
import { createMemoryStorage } from '../../src/storage/presets'
import { getActiveWagen } from '../../src/wagen'
import { installWagen as install, resetWagen } from '../__helpers__/wagen'

function installWagen(defaultStorage?: 'local' | 'session') {
  return install({ storage: { default: defaultStorage } }).wagen
}

afterEach(() => {
  resetWagen()
})

describe('defineStorageState', () => {
  test('reads and writes through the parser without Vue', () => {
    const storage = createMemoryStorage()
    const count = defineStorageState({ key: 'count', storage, parser: parseAsInteger })

    expect(count.get()).toBeNull()

    count.set(5)

    expect(count.get()).toBe(5)
    expect(storage.getItem('count')).toBe('5')
  })

  test('falls back to the parser default', () => {
    const storage = createMemoryStorage()
    const count = defineStorageState({
      key: 'count',
      storage,
      parser: parseAsInteger.withDefault(1),
    })

    expect(count.get()).toBe(1)

    storage.setItem('count', 'not-a-number')

    expect(count.get()).toBe(1)
  })

  test('clearOnDefault removes the key instead of writing the default', () => {
    const storage = createMemoryStorage()
    const count = defineStorageState({
      key: 'count',
      storage,
      parser: parseAsInteger.withDefault(0),
    })

    count.set(3)
    expect(storage.has('count')).toBe(true)

    count.set(0)
    expect(storage.has('count')).toBe(false)
  })

  test('clearOnDefault: false keeps the default in storage', () => {
    const storage = createMemoryStorage()
    const count = defineStorageState({
      key: 'count',
      storage,
      parser: parseAsInteger.withDefault(0),
      clearOnDefault: false,
    })

    count.set(0)

    expect(storage.getItem('count')).toBe('0')
  })

  test('null clears the key and remove() does the same', () => {
    const storage = createMemoryStorage()
    const theme = defineStorageState({ key: 'theme', storage })

    theme.set('dark')
    theme.set(null)
    expect(storage.has('theme')).toBe(false)

    theme.set('dark')
    theme.remove()
    expect(storage.has('theme')).toBe(false)
  })

  test('the storage stays the source of truth', () => {
    const storage = createMemoryStorage()
    const filters = defineStorageState({ key: 'filters', storage, parser: parseAsJson<any>() })

    filters.set({ tags: ['a'] })
    storage.setItem('filters', '{"tags":["x","y"]}')

    expect(filters.get()).toEqual({ tags: ['x', 'y'] })
  })

  test('subscribe fires on writes and the returned function detaches', () => {
    const storage = createMemoryStorage()
    const theme = defineStorageState({ key: 'theme', storage })

    let calls = 0
    const unsubscribe = theme.subscribe(() => calls++)

    theme.set('dark')
    expect(calls).toBe(1)

    storage.setItem('theme', 'light')
    expect(calls).toBe(2)

    unsubscribe()
    theme.set('dark')
    expect(calls).toBe(2)
  })

  test('resolves the storage lazily, so it can be defined before the plugin is installed', () => {
    const theme = defineStorageState({ key: 'theme' })
    const wagen = installWagen()

    theme.set('dark')

    expect(theme.storage).toBe(wagen.storage.local)
    expect(wagen.storage.local.getItem('theme')).toBe('dark')
  })

  test('targets the session storage by name', () => {
    const wagen = installWagen()
    const draft = defineStorageState({ key: 'draft', storage: 'session' })

    draft.set('hello')

    expect(wagen.storage.session.getItem('draft')).toBe('hello')
    expect(wagen.storage.local.has('draft')).toBe(false)
  })

  test('without a storage it lands on the plugin default', () => {
    const wagen = installWagen('session')
    const draft = defineStorageState({ key: 'draft' })

    draft.set('hello')

    expect(draft.storage).toBe(wagen.storage.session)
    expect(wagen.storage.local.has('draft')).toBe(false)
  })

  test('a named storage wins over the plugin default', () => {
    const wagen = installWagen('session')
    const theme = defineStorageState({ key: 'theme', storage: 'local' })

    theme.set('dark')

    expect(wagen.storage.local.getItem('theme')).toBe('dark')
    expect(wagen.storage.session.has('theme')).toBe(false)
  })

  test('an explicit storage never touches the plugin', () => {
    const wagen = installWagen()
    const storage = createMemoryStorage({ prefix: 'analytics:' })
    const seen = defineStorageState({ key: 'seen', storage })

    seen.set('yes')

    expect(storage.getItem('seen')).toBe('yes')
    expect(wagen.storage.local.has('seen')).toBe(false)
  })

  test('defining it without an instance falls back to the implicit default', () => {
    const theme = defineStorageState({ key: 'theme' })

    expect(() => theme.set('dark')).not.toThrow()
    expect(theme.storage).toBe(getActiveWagen().storage.local)
  })

  test('an instance installed after the definition still wins', () => {
    const theme = defineStorageState({ key: 'theme' })
    expect(theme.storage).toBe(getActiveWagen().storage.local)

    const wagen = installWagen()
    theme.set('dark')

    expect(theme.storage).toBe(wagen.storage.local)
    expect(wagen.storage.local.getItem('theme')).toBe('dark')
  })
})
