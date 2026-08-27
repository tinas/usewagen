import { describe, expect, test } from 'vite-plus/test'

import { createStorage } from '../../src/storage/create-storage'
import { createMemoryStorage } from '../../src/storage/presets'
import { objectAdapter } from '../__helpers__/storage'

describe('createStorage', () => {
  test('prefixes keys and strips the prefix back out', () => {
    const backing: Record<string, string> = {}
    const storage = createStorage('object', { ...objectAdapter(backing), prefix: 'app:' })

    storage.setItem('theme', 'dark')

    expect(backing).toEqual({ 'app:theme': 'dark' })
    expect(storage.getItem('theme')).toBe('dark')
    expect(storage.keys()).toEqual(['theme'])
    expect(storage.has('theme')).toBe(true)
    expect(storage.has('missing')).toBe(false)
  })

  test('leaves keys outside the prefix alone', () => {
    const backing: Record<string, string> = { 'other-lib:token': 'x' }
    const storage = createStorage('object', { ...objectAdapter(backing), prefix: 'app:' })

    storage.setItem('theme', 'dark')
    storage.clear()

    expect(storage.keys()).toEqual([])
    expect(backing['other-lib:token']).toBe('x')
  })

  test('writes raw keys when no prefix is configured', () => {
    const backing: Record<string, string> = {}
    const storage = createStorage('object', objectAdapter(backing))

    storage.setItem('theme', 'dark')

    expect(backing).toEqual({ theme: 'dark' })
    expect(storage.prefix).toBe('')
  })

  test('without a prefix the whole adapter is the namespace, clear() included', () => {
    const backing: Record<string, string> = { 'other-lib:token': 'x' }
    const storage = createStorage('object', objectAdapter(backing))

    storage.setItem('theme', 'dark')

    expect(storage.keys().sort()).toEqual(['other-lib:token', 'theme'])

    storage.clear({ except: ['other-lib:token'] })
    expect(backing).toEqual({ 'other-lib:token': 'x' })

    storage.clear()
    expect(backing).toEqual({})
  })

  test('clear() keeps the excepted keys', () => {
    const storage = createMemoryStorage({ prefix: 'app:' })

    storage.setItem('token', 'abc')
    storage.setItem('theme', 'dark')
    storage.clear({ except: ['token'] })

    expect(storage.keys()).toEqual(['token'])
  })

  test('notifies subscribers synchronously on write and remove', () => {
    const storage = createMemoryStorage()
    const seen: string[] = []
    storage.subscribe('theme', () => seen.push('theme'))
    storage.subscribe('lang', () => seen.push('lang'))

    storage.setItem('theme', 'dark')
    storage.removeItem('theme')

    expect(seen).toEqual(['theme', 'theme'])
  })

  test('writing the same value again is a no-op', () => {
    const backing: Record<string, string> = {}
    let writes = 0
    const storage = createStorage('object', {
      ...objectAdapter(backing),
      setItem: (key, value) => {
        writes++
        backing[key] = value
      },
    })

    let notified = 0
    storage.subscribe('theme', () => notified++)

    storage.setItem('theme', 'dark')
    storage.setItem('theme', 'dark')
    storage.setItem('theme', 'dark')

    expect(writes).toBe(1)
    expect(notified).toBe(1)

    storage.setItem('theme', 'light')
    expect(writes).toBe(2)
    expect(notified).toBe(2)
  })

  test('removing an absent key notifies nobody', () => {
    const storage = createMemoryStorage()
    let calls = 0
    storage.subscribe('theme', () => calls++)

    storage.removeItem('theme')

    expect(calls).toBe(0)
  })

  test('unsubscribing stops notifications', () => {
    const storage = createMemoryStorage()
    let calls = 0
    const unsubscribe = storage.subscribe('theme', () => calls++)

    storage.setItem('theme', 'dark')
    unsubscribe()
    storage.setItem('theme', 'light')

    expect(calls).toBe(1)
  })

  test('clear() notifies every key it removed', () => {
    const storage = createMemoryStorage({ prefix: 'app:' })
    storage.setItem('theme', 'dark')
    storage.setItem('lang', 'tr')

    const seen: string[] = []
    storage.subscribe('theme', () => seen.push('theme'))
    storage.subscribe('lang', () => seen.push('lang'))

    storage.clear()

    expect(seen.sort()).toEqual(['lang', 'theme'])
  })

  test('a failed write reports the error and still notifies, so readers re-sync', () => {
    const backing: Record<string, string> = { theme: 'dark' }
    const errors: unknown[] = []
    const storage = createStorage('object', {
      ...objectAdapter(backing),
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      onError: error => errors.push(error),
    })

    let notified = 0
    storage.subscribe('theme', () => notified++)

    storage.setItem('theme', 'light')

    expect(errors).toHaveLength(1)
    expect(notified).toBe(1)
    expect(storage.getItem('theme')).toBe('dark')
  })

  test('a throwing adapter never escapes the public API', () => {
    const boom = () => {
      throw new Error('denied')
    }
    const errors: unknown[] = []
    const storage = createStorage('object', {
      ...objectAdapter(),
      getItem: boom,
      keys: boom,
      onError: error => errors.push(error),
    })

    expect(storage.getItem('theme')).toBe(null)
    expect(storage.has('theme')).toBe(false)
    expect(storage.keys()).toEqual([])
    expect(errors).toHaveLength(3)
  })

  test('accepts a class-based adapter without losing `this`', () => {
    class MapAdapter {
      prefix = 'app:'
      store = new Map<string, string>()
      getItem(key: string) {
        return this.store.get(key) ?? null
      }
      setItem(key: string, value: string) {
        this.store.set(key, value)
      }
      removeItem(key: string) {
        this.store.delete(key)
      }
      keys() {
        return [...this.store.keys()]
      }
    }

    const storage = createStorage('class', new MapAdapter())

    expect(storage.prefix).toBe('app:')
    storage.setItem('theme', 'dark')
    expect(storage.getItem('theme')).toBe('dark')
    expect(storage.keys()).toEqual(['theme'])

    storage.clear()
    expect(storage.keys()).toEqual([])
  })

  test('storages over the same adapter with different prefixes are independent', () => {
    const backing: Record<string, string> = {}
    const app = createStorage('object', { ...objectAdapter(backing), prefix: 'app:' })
    const analytics = createStorage('object', { ...objectAdapter(backing), prefix: 'analytics:' })

    let appNotified = 0
    let analyticsNotified = 0
    app.subscribe('theme', () => appNotified++)
    analytics.subscribe('theme', () => analyticsNotified++)

    app.setItem('theme', 'dark')
    analytics.setItem('theme', 'light')

    expect(backing).toEqual({ 'app:theme': 'dark', 'analytics:theme': 'light' })
    expect(app.keys()).toEqual(['theme'])
    expect(appNotified).toBe(1)
    expect(analyticsNotified).toBe(1)

    app.clear()
    expect(analytics.getItem('theme')).toBe('light')
  })

  test('destroy detaches subscribers but leaves reads working', () => {
    const storage = createMemoryStorage()
    let calls = 0
    storage.subscribe('theme', () => calls++)

    storage.destroy()
    storage.setItem('theme', 'dark')

    expect(calls).toBe(0)
    expect(storage.getItem('theme')).toBe('dark')
  })
})

describe('notifying listeners', () => {
  test('a write made from inside a listener reaches its own subscribers', () => {
    const storage = createMemoryStorage()
    const seen: string[] = []

    storage.subscribe('a', () => {
      seen.push('a')
      storage.setItem('b', '2')
    })
    storage.subscribe('b', () => seen.push('b'))

    storage.setItem('a', '1')

    expect(seen).toEqual(['a', 'b'])
    expect(storage.getItem('b')).toBe('2')
  })

  test('a listener writing the same value back settles instead of looping', () => {
    const storage = createMemoryStorage()
    let calls = 0

    storage.subscribe('k', () => {
      calls++
      storage.setItem('k', 'v')
    })
    storage.setItem('k', 'v')

    expect(calls).toBe(1)
  })

  test('a listener may unsubscribe itself while being notified', () => {
    const storage = createMemoryStorage()
    const seen: string[] = []

    const unsubscribe = storage.subscribe('k', () => {
      seen.push('once')
      unsubscribe()
    })
    storage.subscribe('k', () => seen.push('always'))

    storage.setItem('k', 'a')
    storage.setItem('k', 'b')

    expect(seen).toEqual(['once', 'always', 'always'])
  })

  test('a listener may destroy the storage while being notified', () => {
    const storage = createMemoryStorage()
    storage.subscribe('k', () => storage.destroy())
    storage.subscribe('k', () => {})

    expect(() => storage.setItem('k', 'a')).not.toThrow()
  })
})

describe('watching a adapter', () => {
  function watchable() {
    const backing: Record<string, string> = {}
    let onChange: ((key: string | null) => void) | null = null
    let stops = 0

    return {
      backing,
      adapter: {
        ...objectAdapter(backing),
        watch(next: (key: string | null) => void) {
          onChange = next
          return () => {
            onChange = null
            stops++
          }
        },
      },
      emit: (key: string | null) => onChange?.(key),
      get watching() {
        return onChange !== null
      },
      get stops() {
        return stops
      },
    }
  }

  test('is off unless crossTab is enabled', () => {
    const source = watchable()
    createStorage('object', source.adapter)

    expect(source.watching).toBe(false)
  })

  test('an external change reaches the subscribers of its key', () => {
    const source = watchable()
    const storage = createStorage('object', { ...source.adapter, prefix: 'app:', crossTab: true })

    const seen: (string | null)[] = []
    storage.subscribe('theme', () => seen.push(storage.getItem('theme')))

    source.backing['app:theme'] = 'dark'
    source.emit('app:theme')

    expect(seen).toEqual(['dark'])
  })

  test('a key outside the prefix is ignored', () => {
    const source = watchable()
    const storage = createStorage('object', { ...source.adapter, prefix: 'app:', crossTab: true })

    let notified = 0
    storage.subscribe('theme', () => notified++)

    source.emit('other:theme')

    expect(notified).toBe(0)
  })

  test('null notifies every subscriber', () => {
    const source = watchable()
    const storage = createStorage('object', { ...source.adapter, prefix: 'app:', crossTab: true })

    const seen: string[] = []
    storage.subscribe('theme', () => seen.push('theme'))
    storage.subscribe('lang', () => seen.push('lang'))

    source.emit(null)

    expect(seen.sort()).toEqual(['lang', 'theme'])
  })

  test('destroy stops watching', () => {
    const source = watchable()
    const storage = createStorage('object', { ...source.adapter, crossTab: true })

    expect(source.watching).toBe(true)
    storage.destroy()
    expect(source.stops).toBe(1)
  })

  test('a adapter that cannot watch still works with crossTab enabled', () => {
    const backing: Record<string, string> = {}
    const storage = createStorage('object', { ...objectAdapter(backing), crossTab: true })

    expect(() => storage.setItem('theme', 'dark')).not.toThrow()
    expect(storage.getItem('theme')).toBe('dark')
  })
})
