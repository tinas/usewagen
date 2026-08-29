import type { StorageInstance } from '../../src/storage/create-storage'

import { afterEach, beforeEach, describe, expect, expectTypeOf, test } from 'vite-plus/test'
import { computed, effectScope, nextTick, ref, watch } from 'vue'

import { parseAsInteger, parseAsJson } from '../../src/parser/parsers'
import { createStorage } from '../../src/storage/create-storage'
import { defineStorageState } from '../../src/storage/define-storage-state'
import { createMemoryStorage } from '../../src/storage/presets'
import { useLocalStorage, useStorage } from '../../src/storage/use-storage'
import { installWagen, resetWagen } from '../__helpers__/wagen'

let storage: StorageInstance

beforeEach(() => {
  storage = createMemoryStorage()
})

afterEach(() => {
  resetWagen()
})

describe('useStorage', () => {
  test('reads back the written value synchronously', () => {
    const state = useStorage({ key: 'count', storage, parser: parseAsInteger })

    state.value = 5

    expect(state.value).toBe(5)
    expect(storage.getItem('count')).toBe('5')
  })

  test('a single nextTick is enough for watchers to see the write', async () => {
    const scope = effectScope()
    const seen: unknown[] = []
    let state!: ReturnType<typeof useStorage>

    scope.run(() => {
      state = useStorage({ key: 'count', storage, parser: parseAsInteger.withDefault(0) })
      watch(state, value => seen.push(value))
    })

    state.value = 5
    await nextTick()

    expect(seen).toEqual([5])
    scope.stop()
  })

  test('consecutive writes collapse into a single watcher run', async () => {
    const scope = effectScope()
    const seen: unknown[] = []
    let state!: ReturnType<typeof useStorage>

    scope.run(() => {
      state = useStorage({ key: 'count', storage, parser: parseAsInteger.withDefault(0) })
      watch(state, value => seen.push(value))
    })

    for (let i = 1; i <= 10; i++) state.value = i
    await nextTick()

    expect(seen).toEqual([10])
    expect(storage.getItem('count')).toBe('10')
    scope.stop()
  })

  test('a sync watcher still sees every intermediate write', async () => {
    const scope = effectScope()
    const seen: unknown[] = []
    let state!: ReturnType<typeof useStorage>

    scope.run(() => {
      state = useStorage({ key: 'count', storage, parser: parseAsInteger.withDefault(0) })
      watch(state, value => seen.push(value), { flush: 'sync' })
    })

    state.value = 1
    state.value = 2

    expect(seen).toEqual([1, 2])
    scope.stop()
  })

  test('storage stays the source of truth: reads always come from it', () => {
    const state = useStorage({ key: 'filters', storage, parser: parseAsJson<any>() })

    state.value = { tags: ['a'] }
    storage.setItem('filters', '{"tags":["x","y"]}')

    expect(state.value).toEqual({ tags: ['x', 'y'] })
  })

  test('mutating the read value does not reach storage, and the next read proves it', () => {
    const state = useStorage({ key: 'filters', storage, parser: parseAsJson<any>() })
    state.value = { tags: ['a'], page: 1 }

    state.value.page = 2
    state.value.tags.push('b')

    expect(storage.getItem('filters')).toBe('{"tags":["a"],"page":1}')
    expect(state.value).toEqual({ tags: ['a'], page: 1 })
  })

  test('a default factory runs per read, so its value is never shared', () => {
    const state = useStorage({
      key: 'filters',
      storage,
      parser: parseAsJson<{ tags: string[] }>().withDefault(() => ({ tags: [] })),
    })

    state.value.tags.push('x')

    expect(state.value).toEqual({ tags: [] })
  })

  test('falls back to the default when the stored value is missing or unparseable', () => {
    const state = useStorage({ key: 'count', storage, parser: parseAsInteger.withDefault(42) })

    expect(state.value).toBe(42)

    storage.setItem('count', 'not-a-number')
    expect(state.value).toBe(42)
  })

  test('clearOnDefault removes the key instead of storing the default', () => {
    const state = useStorage({ key: 'count', storage, parser: parseAsInteger.withDefault(0) })

    state.value = 5
    expect(storage.has('count')).toBe(true)

    state.value = 0
    expect(storage.has('count')).toBe(false)
    expect(state.value).toBe(0)
  })

  test('clearOnDefault: false keeps the default in storage', () => {
    const state = useStorage({
      key: 'count',
      storage,
      parser: parseAsInteger.withDefault(0),
      clearOnDefault: false,
    })

    state.value = 0

    expect(storage.getItem('count')).toBe('0')
  })

  test('null and undefined clear the key', () => {
    const state = useStorage({ key: 'theme', storage })

    state.value = 'dark'
    state.value = null
    expect(storage.has('theme')).toBe(false)

    state.value = 'dark'
    state.value = undefined
    expect(storage.has('theme')).toBe(false)
  })

  test('two refs on the same key stay in sync', () => {
    const a = useStorage({ key: 'count', storage, parser: parseAsInteger })
    const b = useStorage({ key: 'count', storage, parser: parseAsInteger })

    a.value = 7

    expect(b.value).toBe(7)
  })

  test('refs on storages with different prefixes do not collide', () => {
    const backing: Record<string, string> = {}
    const adapter = {
      getItem: (key: string) => backing[key] ?? null,
      setItem: (key: string, value: string) => {
        backing[key] = value
      },
      removeItem: (key: string) => {
        delete backing[key]
      },
      keys: () => Object.keys(backing),
    }
    const app = createStorage('object', { ...adapter, prefix: 'app:' })
    const analytics = createStorage('object', { ...adapter, prefix: 'analytics:' })

    const appTheme = useStorage({ key: 'theme', storage: app })
    const analyticsTheme = useStorage({ key: 'theme', storage: analytics })

    appTheme.value = 'dark'
    analyticsTheme.value = 'light'

    expect(appTheme.value).toBe('dark')
    expect(analyticsTheme.value).toBe('light')
    expect(backing).toEqual({ 'app:theme': 'dark', 'analytics:theme': 'light' })
  })

  test('an external write to the storage updates the ref', () => {
    const state = useStorage({ key: 'count', storage, parser: parseAsInteger })

    storage.setItem('count', '9')

    expect(state.value).toBe(9)
  })

  test('a failed write leaves the ref on the value that is actually stored', async () => {
    const backing: Record<string, string> = { count: '1' }
    let failing = false
    const guarded = createStorage('object', {
      getItem: key => backing[key] ?? null,
      setItem: (key, value) => {
        if (failing) throw new Error('QuotaExceededError')
        backing[key] = value
      },
      removeItem: key => {
        delete backing[key]
      },
      keys: () => Object.keys(backing),
      onError: () => {},
    })

    const scope = effectScope()
    const seen: unknown[] = []
    let state!: ReturnType<typeof useStorage>
    scope.run(() => {
      state = useStorage({ key: 'count', storage: guarded, parser: parseAsInteger })
      watch(state, value => seen.push(value))
    })

    failing = true
    state.value = 2
    await nextTick()

    expect(state.value).toBe(1)
    expect(seen).toEqual([])
    scope.stop()
  })

  test('stopping the scope unsubscribes from the storage', () => {
    let unsubscribes = 0
    const subscribe = storage.subscribe
    storage.subscribe = (key, listener) => {
      const unsubscribe = subscribe(key, listener)
      return () => {
        unsubscribes++
        unsubscribe()
      }
    }

    const scope = effectScope()
    scope.run(() => useStorage({ key: 'theme', storage }))
    expect(unsubscribes).toBe(0)

    scope.stop()
    expect(unsubscribes).toBe(1)
  })

  test('accepts a parser referenced by name', () => {
    const state = useStorage({
      key: 'page',
      storage,
      parser: { name: 'parseAsInteger', defaultValue: 1 },
    })

    expect(state.value).toBe(1)
    state.value = 3
    expect(storage.getItem('page')).toBe('3')
  })

  test('round-trips objects through parseAsJson', () => {
    const state = useStorage({ key: 'filters', storage, parser: parseAsJson<any>() })

    state.value = { tags: ['a', 'b'], page: 2 }

    expect(storage.getItem('filters')).toBe('{"tags":["a","b"],"page":2}')
    expect(state.value).toEqual({ tags: ['a', 'b'], page: 2 })
  })
})

describe('useStorage over an existing state', () => {
  test('shares the state instead of redefining it', () => {
    const count = defineStorageState({ key: 'count', storage, parser: parseAsInteger })
    const state = useStorage(count)

    state.value = 4

    expect(count.get()).toBe(4)
    expect(storage.getItem('count')).toBe('4')

    count.set(7)
    expect(state.value).toBe(7)
  })

  test('two refs over the same state stay in sync', async () => {
    const count = defineStorageState({ key: 'count', storage, parser: parseAsInteger })
    const a = useStorage(count)
    const b = useStorage(count)

    const seen: (number | null)[] = []
    const scope = effectScope()
    scope.run(() => watch(b, value => seen.push(value)))

    a.value = 3
    await nextTick()

    expect(b.value).toBe(3)
    expect(seen).toEqual([3])
    scope.stop()
  })

  test('a state defined at module level survives a stopped scope', () => {
    const theme = defineStorageState({ key: 'theme', storage })

    const scope = effectScope()
    scope.run(() => useStorage(theme))
    scope.stop()

    theme.set('dark')

    expect(theme.get()).toBe('dark')
    expect(useStorage(theme).value).toBe('dark')
  })
})

describe('useStorage reactive options', () => {
  test('a getter key moves the ref to another slot', () => {
    storage.setItem('cfg:1', '10')
    storage.setItem('cfg:2', '20')

    const scope = effectScope()
    scope.run(() => {
      const userId = ref(1)
      const state = useStorage({
        key: () => `cfg:${userId.value}`,
        storage,
        parser: parseAsInteger,
      })

      expect(state.value).toBe(10)
      userId.value = 2
      expect(state.value).toBe(20)
    })
    scope.stop()
  })

  test('a ref key works the same as a getter', () => {
    storage.setItem('a', 'first')
    storage.setItem('b', 'second')

    const scope = effectScope()
    scope.run(() => {
      const key = ref('a')
      const state = useStorage({ key, storage })

      expect(state.value).toBe('first')
      key.value = 'b'
      expect(state.value).toBe('second')
    })
    scope.stop()
  })

  test('the whole options object can be a getter or a ref', () => {
    storage.setItem('a', 'first')
    storage.setItem('b', 'second')

    const scope = effectScope()
    scope.run(() => {
      const key = ref('a')
      const fromGetter = useStorage(() => ({ key: key.value, storage }))
      const fromRef = useStorage(computed(() => ({ key: key.value, storage })))

      expect(fromGetter.value).toBe('first')
      expect(fromRef.value).toBe('first')

      key.value = 'b'
      expect(fromGetter.value).toBe('second')
      expect(fromRef.value).toBe('second')
    })
    scope.stop()
  })

  test('writes land on the current key and never migrate the old one', () => {
    const scope = effectScope()
    scope.run(() => {
      const key = ref('a')
      const state = useStorage({ key, storage })

      state.value = 'kept'
      key.value = 'b'

      expect(state.value).toBeNull()
      expect(storage.getItem('a')).toBe('kept')
      expect(storage.has('b')).toBe(false)

      state.value = 'fresh'
      expect(storage.getItem('b')).toBe('fresh')
      expect(storage.getItem('a')).toBe('kept')
    })
    scope.stop()
  })

  test('the subscription moves with the key', () => {
    const scope = effectScope()
    scope.run(() => {
      const key = ref('a')
      const state = useStorage({ key, storage })
      const seen: (string | null)[] = []
      watch(state, value => seen.push(value), { flush: 'sync' })

      storage.setItem('a', '1')
      expect(seen).toEqual(['1'])

      key.value = 'b'
      expect(seen).toEqual(['1', null])

      storage.setItem('a', '2')
      expect(seen).toEqual(['1', null])

      storage.setItem('b', '3')
      expect(seen).toEqual(['1', null, '3'])
    })
    scope.stop()
  })

  test('a watcher fires when only the key changes', async () => {
    storage.setItem('a', '1')
    storage.setItem('b', '2')

    const key = ref('a')
    const seen: (number | null)[] = []
    const scope = effectScope()

    scope.run(() => {
      const state = useStorage({ key, storage, parser: parseAsInteger })
      watch(state, value => seen.push(value))
    })

    key.value = 'b'
    await nextTick()
    expect(seen).toEqual([2])

    key.value = 'a'
    await nextTick()
    expect(seen).toEqual([2, 1])
    scope.stop()
  })

  test('every key change releases the previous subscription', () => {
    let subscribes = 0
    let unsubscribes = 0
    const subscribe = storage.subscribe
    storage.subscribe = (key, listener) => {
      subscribes++
      const unsubscribe = subscribe(key, listener)
      return () => {
        unsubscribes++
        unsubscribe()
      }
    }

    const scope = effectScope()
    scope.run(() => {
      const key = ref('k0')
      useStorage({ key, storage })

      for (let i = 1; i <= 3; i++) key.value = `k${i}`

      expect(subscribes).toBe(4)
      expect(unsubscribes).toBe(3)
    })

    scope.stop()
    expect(unsubscribes).toBe(4)
  })

  test('a getter storage switches the backing instance', () => {
    const other = createMemoryStorage()
    storage.setItem('token', 'from-first')
    other.setItem('token', 'from-second')

    const scope = effectScope()
    scope.run(() => {
      const useOther = ref(false)
      const state = useStorage({
        key: 'token',
        storage: () => (useOther.value ? other : storage),
      })

      expect(state.value).toBe('from-first')
      useOther.value = true
      expect(state.value).toBe('from-second')
    })
    scope.stop()
  })

  test('a named storage source can be reactive', () => {
    const { wagen, run } = installWagen()
    wagen.storage.local.setItem('token', 'from-local')
    wagen.storage.session.setItem('token', 'from-session')

    run(() => {
      const guest = ref(false)
      const state = useStorage({
        key: 'token',
        storage: () => (guest.value ? 'session' : 'local'),
      })

      expect(state.value).toBe('from-local')
      guest.value = true
      expect(state.value).toBe('from-session')
    })
  })

  test('clearOnDefault can be reactive', () => {
    const scope = effectScope()
    scope.run(() => {
      const clear = ref(true)
      const state = useStorage({
        key: 'count',
        storage,
        clearOnDefault: clear,
        parser: parseAsInteger.withDefault(0),
      })

      state.value = 0
      expect(storage.has('count')).toBe(false)

      clear.value = false
      state.value = 0
      expect(storage.getItem('count')).toBe('0')
    })
    scope.stop()
  })

  test('useLocalStorage keeps per-field getters', () => {
    const { wagen, run } = installWagen()
    wagen.storage.local.setItem('u:7', '5')

    run(() => {
      const id = ref(7)
      const state = useLocalStorage({ key: () => `u:${id.value}`, parser: parseAsInteger })

      expect(state.value).toBe(5)
      id.value = 8
      expect(state.value).toBeNull()

      state.value = 3
      expect(wagen.storage.local.getItem('u:8')).toBe('3')
      expect(wagen.storage.local.getItem('u:7')).toBe('5')
    })
  })

  test('every read still hits the storage after the key changed', () => {
    const scope = effectScope()
    scope.run(() => {
      const key = ref('filters')
      const state = useStorage({ key, storage, parser: parseAsJson<any>() })

      state.value = { tags: ['a'] }
      storage.setItem('filters', '{"tags":["x"]}')

      expect(state.value).toEqual({ tags: ['x'] })
      expect(state.value).not.toBe(state.value)
    })
    scope.stop()
  })
})

describe('useStorage type inference', () => {
  test('falls back to the default parser when none is given', () => {
    const theme = useStorage({ key: 'theme', storage })

    expectTypeOf(theme.value).toEqualTypeOf<string | null>()
    expect(theme.value).toBeNull()
  })

  test('a parser instance with a default infers the value', () => {
    const count = useStorage({ key: 'count', storage, parser: parseAsInteger.withDefault(0) })

    expectTypeOf(count.value).toEqualTypeOf<number>()
  })

  test('a state carries its own type through', () => {
    const state = defineStorageState({ key: 'count', storage, parser: parseAsInteger })
    const count = useStorage(state)

    expectTypeOf(count.value).toEqualTypeOf<number | null>()
  })
})

describe('useStorage option typing', () => {
  test('a named parser ref infers through the registry', () => {
    const withName = useStorage({ key: 'k', storage, parser: { name: 'parseAsInteger' } })
    const withDefault = useStorage({
      key: 'k',
      storage,
      parser: { name: 'parseAsInteger', defaultValue: 3 },
    })

    expectTypeOf(withName.value).toEqualTypeOf<number | null>()
    expectTypeOf(withDefault.value).toEqualTypeOf<number>()
  })

  test('rejects a misspelled option and an unknown parser name', () => {
    function reject() {
      // @ts-expect-error unknown option
      useStorage({ key: 'k', storage, clearOnDefaults: true })
      // @ts-expect-error unknown parser name
      useStorage({ key: 'k', storage, parser: { name: 'parseAsNope' } })
      // @ts-expect-error unknown option
      defineStorageState({ key: 'k', storage, bogus: 1 })
    }

    expect(typeof reject).toBe('function')
  })
})
