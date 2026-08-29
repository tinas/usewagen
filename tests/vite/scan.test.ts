import { afterEach, describe, expect, test, vi } from 'vite-plus/test'

import { isParserFile, scanParsers } from '../../src/vite/scan'
import { ErrorCodes, getMessage } from '../../src/messages'
import { createFixtures } from './__helpers__'

const { parsersDir, writeParser, clean } = createFixtures('scan')

afterEach(() => {
  clean()
  vi.restoreAllMocks()
})

describe('isParserFile', () => {
  test('accepts the ESM JavaScript and TypeScript extensions', () => {
    for (const name of ['money.ts', 'money.mts', 'money.js', 'money.mjs']) {
      expect(isParserFile(name)).toBe(true)
    }
  })

  test('rejects CommonJS, which this package does not target', () => {
    expect(isParserFile('money.cts')).toBe(false)
    expect(isParserFile('money.cjs')).toBe(false)
  })

  test('rejects declaration files', () => {
    expect(isParserFile('types.d.ts')).toBe(false)
    expect(isParserFile('types.d.mts')).toBe(false)
  })

  test('only .d.ts and .d.mts count as declarations', () => {
    expect(isParserFile('types.d.js')).toBe(true)
    expect(isParserFile('types.d.mjs')).toBe(true)
  })

  test('rejects a name that is only an extension', () => {
    expect(isParserFile('.ts')).toBe(false)
    expect(isParserFile('money')).toBe(false)
  })

  test('rejects anything that is not a module', () => {
    expect(isParserFile('notes.md')).toBe(false)
    expect(isParserFile('money.json')).toBe(false)
    expect(isParserFile('Money.vue')).toBe(false)
  })

  test('rejects JSX, which the lexer cannot read', () => {
    expect(isParserFile('money.tsx')).toBe(false)
    expect(isParserFile('money.jsx')).toBe(false)
  })
})

describe('scanParsers', () => {
  test('returns nothing for a directory that does not exist', () => {
    expect(scanParsers(['/nonexistent/path'])).toEqual([])
  })

  test('collects every parseAs* const with its file', () => {
    const file = writeParser(
      'pagination.ts',
      `
export const parseAsPage = defineParser({ parse: Number, serialize: String })
export const parseAsSort = parseAsStringLiteral(['asc', 'desc'])
`,
    )

    expect(scanParsers([parsersDir])).toEqual([
      { name: 'parseAsPage', file },
      { name: 'parseAsSort', file },
    ])
  })

  test('walks nested directories', () => {
    const file = writeParser('nested/deep.ts', 'export const parseAsDeep = 1')

    expect(scanParsers([parsersDir])).toEqual([{ name: 'parseAsDeep', file }])
  })

  test('merges several directories', () => {
    const a = writeParser('a.ts', 'export const parseAsA = 1')
    const b = writeParser('nested/b.ts', 'export const parseAsB = 1')

    const entries = scanParsers([parsersDir, `${parsersDir}/nested`])

    expect(entries).toContainEqual({ name: 'parseAsA', file: a })
    expect(entries.filter(entry => entry.file === b)).toHaveLength(1)
  })

  test('scans plain JavaScript parsers too', () => {
    const file = writeParser('money.js', 'export const parseAsMoney = defineParser({})')

    expect(scanParsers([parsersDir])).toEqual([{ name: 'parseAsMoney', file }])
  })

  test('ignores function exports and declaration files', () => {
    writeParser('types.d.ts', 'export const parseAsIgnored = 1')
    writeParser(
      'factory.ts',
      `
export function parseAsCustom(values) { return defineParser({}) }
export const parseAsValid = defineParser({})
`,
    )

    expect(scanParsers([parsersDir])).toEqual([
      { name: 'parseAsValid', file: `${parsersDir}/factory.ts` },
    ])
  })

  test('ignores matches inside comments, strings and regexes', () => {
    writeParser(
      'commented.ts',
      `
// export const parseAsCommented = 1
/*
export const parseAsBlockCommented = 1
*/
const snippet = 'export const parseAsQuoted = 1'
const pattern = /export const parseAsRegex/

export const parseAsReal = defineParser({})
`,
    )

    expect(scanParsers([parsersDir]).map(entry => entry.name)).toEqual(['parseAsReal'])
  })

  test('skips names reserved by a built-in and warns', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const file = writeParser(
      'shadow.ts',
      `
export const parseAsString = defineParser({})
export const parseAsMoney = defineParser({})
`,
    )

    expect(scanParsers([parsersDir]).map(entry => entry.name)).toEqual(['parseAsMoney'])
    expect(spy).toHaveBeenCalledWith(
      getMessage(ErrorCodes.RESERVED_PARSER_NAME),
      'parseAsString',
      file,
    )
  })

  test('keeps the last definition of a duplicated name and warns', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const a = writeParser('a.ts', 'export const parseAsDup = 1')
    const b = writeParser('b.ts', 'export const parseAsDup = 2')

    expect(scanParsers([parsersDir])).toEqual([{ name: 'parseAsDup', file: b }])
    expect(spy).toHaveBeenCalledWith(
      getMessage(ErrorCodes.DUPLICATE_PARSER_NAME),
      'parseAsDup',
      a,
      b,
    )
  })
})
