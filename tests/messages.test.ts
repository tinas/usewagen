import { describe, expect, test } from 'vite-plus/test'

import { ErrorCodes, errorMessages, getMessage } from '../src/messages'

describe('getMessage', () => {
  test('prefixes the message of the given code', () => {
    expect(getMessage(ErrorCodes.NO_STORAGE)).toBe(
      `[usewagen] ${errorMessages[ErrorCodes.NO_STORAGE]}`,
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
