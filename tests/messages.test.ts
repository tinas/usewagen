import { afterEach, describe, expect, test, vi } from 'vite-plus/test'

import { ErrorCodes, errorMessages, getMessage, warn, warnDev } from '../src/messages'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('getMessage', () => {
  test('prefixes the message of the given code', () => {
    expect(getMessage(ErrorCodes.PARSE_FAILED)).toBe(
      `[usewagen] ${errorMessages[ErrorCodes.PARSE_FAILED]}`,
    )
  })

  test('every code has a message and every message starts with the prefix', () => {
    const codes = Object.values(ErrorCodes)

    expect(Object.keys(errorMessages)).toHaveLength(codes.length)
    for (const code of codes) {
      expect(errorMessages[code]).toBeTypeOf('string')
      expect(getMessage(code).startsWith('[usewagen] ')).toBe(true)
    }
  })

  test('the codes stay unique', () => {
    const codes = Object.values(ErrorCodes)

    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('warn', () => {
  test('forwards the message and the details to console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    warn(ErrorCodes.UNKNOWN_PARSER_NAME, 'parseAsMoney', 'extra')

    expect(spy).toHaveBeenCalledWith(
      getMessage(ErrorCodes.UNKNOWN_PARSER_NAME),
      'parseAsMoney',
      'extra',
    )
  })

  test('reports runtime conditions even in production', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'production')

    warn(ErrorCodes.WEB_STORAGE_UNAVAILABLE, 'localStorage')

    expect(spy).toHaveBeenCalledOnce()
  })
})

describe('warnDev', () => {
  test('reports misuse outside production', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'development')

    warnDev(ErrorCodes.NO_EFFECT_SCOPE, 'useStorage')

    expect(spy).toHaveBeenCalledWith(getMessage(ErrorCodes.NO_EFFECT_SCOPE), 'useStorage')
  })

  test('stays silent in production', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'production')

    warnDev(ErrorCodes.NO_EFFECT_SCOPE, 'useStorage')

    expect(spy).not.toHaveBeenCalled()
  })
})
