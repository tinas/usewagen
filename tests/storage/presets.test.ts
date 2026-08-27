import { afterEach, describe, expect, test, vi } from 'vite-plus/test'

import {
  createLocalStorage,
  createMemoryStorage,
  createSessionStorage,
} from '../../src/storage/presets'
import { fakeArea, restoreWindow, stubWindow } from '../__helpers__/storage'

describe('built-in storages', () => {
  afterEach(restoreWindow)

  test('createMemoryStorage is self-contained', () => {
    const a = createMemoryStorage()
    const b = createMemoryStorage()

    a.setItem('theme', 'dark')

    expect(a.name).toBe('memory')
    expect(a.getItem('theme')).toBe('dark')
    expect(b.getItem('theme')).toBe(null)
  })

  test('without a window the storage is inert instead of crashing', () => {
    restoreWindow()
    const storage = createLocalStorage()

    storage.setItem('theme', 'dark')

    expect(storage.getItem('theme')).toBe(null)
    expect(storage.keys()).toEqual([])
  })

  test('falls back to memory when localStorage access is denied', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    stubWindow({
      localStorage: {
        get() {
          throw new Error('SecurityError: access denied')
        },
      },
    })

    const storage = createLocalStorage()
    storage.setItem('theme', 'dark')

    expect(storage.name).toBe('local')
    expect(storage.getItem('theme')).toBe('dark')
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  test('a write-denied area is reported, not swapped for memory', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const area = fakeArea()
    area.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    stubWindow({ localStorage: { value: area } })

    const errors: unknown[] = []
    const storage = createLocalStorage({ onError: error => errors.push(error) })

    let notified = 0
    storage.subscribe('theme', () => notified++)
    storage.setItem('theme', 'dark')

    expect(storage.name).toBe('local')
    expect(errors).toHaveLength(1)
    expect(notified).toBe(1)
    expect(storage.getItem('theme')).toBe(null)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  test('reads and writes through the real web storage when available', () => {
    const { win } = stubWindow()

    const storage = createSessionStorage({ prefix: 'app:' })
    storage.setItem('theme', 'dark')

    expect(win.sessionStorage.getItem('app:theme')).toBe('dark')
    expect(storage.keys()).toEqual(['theme'])
  })
})

describe('cross-tab sync over the native storage event', () => {
  const open: Array<{ destroy: () => void }> = []

  afterEach(() => {
    for (const storage of open.splice(0)) storage.destroy()
    restoreWindow()
  })

  test('a write in another tab reaches the subscribers of this one, once', () => {
    const { win, emit } = stubWindow()

    const storage = createLocalStorage({ prefix: 'app:' })
    open.push(storage)

    const seen: (string | null)[] = []
    storage.subscribe('theme', () => seen.push(storage.getItem('theme')))

    win.localStorage.setItem('app:theme', 'dark')
    emit('storage', { key: 'app:theme', newValue: 'dark', storageArea: win.localStorage })

    expect(seen).toEqual(['dark'])
  })

  test('a clear in another tab notifies every subscriber', () => {
    const { win, emit } = stubWindow()

    const storage = createLocalStorage({ prefix: 'app:' })
    open.push(storage)
    storage.setItem('theme', 'dark')
    storage.setItem('lang', 'tr')

    const seen: string[] = []
    storage.subscribe('theme', () => seen.push('theme'))
    storage.subscribe('lang', () => seen.push('lang'))

    win.localStorage.clear()
    emit('storage', { key: null, storageArea: win.localStorage })

    expect(seen.sort()).toEqual(['lang', 'theme'])
  })

  test('another prefix and another area are ignored', () => {
    const { win, emit } = stubWindow()

    const storage = createLocalStorage({ prefix: 'app:' })
    open.push(storage)

    let notified = 0
    storage.subscribe('theme', () => notified++)

    emit('storage', { key: 'other:theme', storageArea: win.localStorage })
    emit('storage', { key: 'app:theme', storageArea: win.sessionStorage })

    expect(notified).toBe(0)
  })

  test('createSessionStorage does not sync across tabs by default', () => {
    const { win, emit } = stubWindow()

    const storage = createSessionStorage({ prefix: 'app:' })
    open.push(storage)

    let notified = 0
    storage.subscribe('theme', () => notified++)

    emit('storage', { key: 'app:theme', storageArea: win.sessionStorage })

    expect(notified).toBe(0)
  })

  test('createMemoryStorage has nothing to listen to', () => {
    const { listenerCount } = stubWindow()

    open.push(createMemoryStorage({ crossTab: true }))

    expect(listenerCount('storage')).toBe(0)
  })

  test('a malformed event is ignored instead of throwing', () => {
    const { emit } = stubWindow()

    open.push(createLocalStorage({ prefix: 'app:' }))

    expect(() => emit('storage', { key: undefined })).not.toThrow()
    expect(() => emit('storage', { key: 42 })).not.toThrow()
    expect(() => emit('storage', {})).not.toThrow()
  })

  test('destroy removes the listener, even after the window is gone', () => {
    const { listenerCount } = stubWindow()

    const storage = createLocalStorage({ prefix: 'app:' })
    expect(listenerCount('storage')).toBe(1)

    restoreWindow()
    expect(() => storage.destroy()).not.toThrow()
    expect(listenerCount('storage')).toBe(0)
  })
})
