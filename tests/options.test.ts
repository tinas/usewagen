import type { ReactiveFields, ReactiveOptions } from '../src/options'

import { describe, expect, expectTypeOf, test } from 'vite-plus/test'
import { computed, ref, shallowRef } from 'vue'

import { toValueDeep } from '../src/options'

interface Options {
  key: string
  count?: number
  flag?: boolean
}

describe('toValueDeep', () => {
  test('leaves a plain object untouched', () => {
    expect(toValueDeep<Options>({ key: 'a', count: 1 })).toEqual({ key: 'a', count: 1 })
  })

  test('unwraps a ref field', () => {
    const key = ref('a')
    const options = { key }

    expect(toValueDeep<Options>(options)).toEqual({ key: 'a' })
    key.value = 'b'
    expect(toValueDeep<Options>(options)).toEqual({ key: 'b' })
  })

  test('unwraps a getter field', () => {
    const key = ref('a')
    const options = { key: () => `${key.value}!` }

    expect(toValueDeep<Options>(options)).toEqual({ key: 'a!' })
    key.value = 'b'
    expect(toValueDeep<Options>(options)).toEqual({ key: 'b!' })
  })

  test('unwraps the whole object given as a getter', () => {
    const key = ref('a')

    expect(toValueDeep<Options>(() => ({ key: key.value }))).toEqual({ key: 'a' })
  })

  test('unwraps the whole object given as a ref', () => {
    const options = shallowRef({ key: 'a' })

    expect(toValueDeep<Options>(options)).toEqual({ key: 'a' })
    options.value = { key: 'b' }
    expect(toValueDeep<Options>(options)).toEqual({ key: 'b' })
  })

  test('unwraps both levels at once', () => {
    const count = ref(1)
    const options = computed(() => ({ key: 'a', count: () => count.value * 2 }))

    expect(toValueDeep<Options>(options)).toEqual({ key: 'a', count: 2 })
    count.value = 3
    expect(toValueDeep<Options>(options)).toEqual({ key: 'a', count: 6 })
  })

  test('returns a fresh object and never mutates the input', () => {
    const key = ref('a')
    const options = { key }

    const first = toValueDeep<Options>(options)
    const second = toValueDeep<Options>(options)

    expect(first).not.toBe(second)
    expect(options.key).toBe(key)
  })

  test('keeps a falsy or undefined field instead of dropping it', () => {
    expect(toValueDeep<Options>({ key: '', count: () => 0, flag: ref(false) })).toEqual({
      key: '',
      count: 0,
      flag: false,
    })
  })

  test('tracks the refs it reads', () => {
    const key = ref('a')
    const resolved = computed(() => toValueDeep<Options>({ key }))

    expect(resolved.value.key).toBe('a')
    key.value = 'b'
    expect(resolved.value.key).toBe('b')
  })
})

describe('reactive option types', () => {
  test('every field accepts a value, a ref or a getter', () => {
    const asValue: ReactiveOptions<Options> = { key: 'a' }
    const asRef: ReactiveOptions<Options> = { key: ref('a') }
    const asGetter: ReactiveOptions<Options> = { key: () => 'a' }
    const asObjectGetter: ReactiveOptions<Options> = () => ({ key: 'a' })

    expect([asValue, asRef, asGetter, asObjectGetter]).toHaveLength(4)
  })

  test('a static field stays plain', () => {
    expectTypeOf<ReactiveFields<Options, 'key'>['key']>().toEqualTypeOf<string>()

    const options: ReactiveOptions<Options, 'key'> = { key: 'a', count: () => 1 }

    function reject() {
      // @ts-expect-error key is declared static
      const bad: ReactiveOptions<Options, 'key'> = { key: () => 'a' }
      return bad
    }

    expect(options.key).toBe('a')
    expect(typeof reject).toBe('function')
  })
})
