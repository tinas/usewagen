import { describe, expect, test } from 'vite-plus/test'

import { stripNonCode } from '../../src/vite/strip'

describe('stripNonCode', () => {
  test('drops line comments', () => {
    expect(stripNonCode('const a = 1 // export const parseAsX')).not.toContain('parseAsX')
  })

  test('drops block comments but keeps the line count', () => {
    const source = 'a\n/*\nexport const parseAsX\n*/\nb'
    const stripped = stripNonCode(source)

    expect(stripped).not.toContain('parseAsX')
    expect(stripped.split('\n')).toHaveLength(source.split('\n').length)
  })

  test('drops string contents in every quote style', () => {
    const stripped = stripNonCode(
      [
        'const a = "export const parseAsA"',
        "const b = 'export const parseAsB'",
        'const c = `export const parseAsC`',
      ].join('\n'),
    )

    expect(stripped).not.toContain('parseAsA')
    expect(stripped).not.toContain('parseAsB')
    expect(stripped).not.toContain('parseAsC')
  })

  test('keeps escaped quotes from ending the string early', () => {
    const stripped = stripNonCode('const a = "he said \\"export const parseAsX\\"" \nconst b = 1')

    expect(stripped).not.toContain('parseAsX')
    expect(stripped).toContain('const b')
  })

  test('drops regex literals', () => {
    expect(stripNonCode('const r = /export const parseAsX/')).not.toContain('parseAsX')
  })

  test('does not mistake division for a regex', () => {
    const stripped = stripNonCode('const ratio = total / count\nexport const parseAsX = 1')

    expect(stripped).toContain('parseAsX')
  })

  test('keeps a slash inside a character class from closing the regex', () => {
    const stripped = stripNonCode('const r = /[/]/\nexport const parseAsX = 1')

    expect(stripped).toContain('parseAsX')
  })
})
