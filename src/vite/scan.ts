import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isBuiltinParserName } from '../parser/builtins'
import { ErrorCodes, warn } from '../messages'
import { stripNonCode } from './strip'

export interface ParserEntry {
  name: string
  file: string
}

const PARSER_FILE = /\.m?[jt]s$/
const DECLARATION_FILE = /\.d\.m?ts$/
const PARSER_EXPORT = /export\s+const\s+(parseAs\w+)/g

export function isParserFile(name: string): boolean {
  return PARSER_FILE.test(name) && !DECLARATION_FILE.test(name)
}

function extractNames(file: string): string[] {
  const source = stripNonCode(readFileSync(file, 'utf-8'))
  const names: string[] = []

  PARSER_EXPORT.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = PARSER_EXPORT.exec(source)) !== null) {
    const name = match[1]!
    if (isBuiltinParserName(name)) {
      warn(ErrorCodes.RESERVED_PARSER_NAME, name, file)
      continue
    }
    names.push(name)
  }

  return names
}

function walk(dir: string, entries: ParserEntry[]): void {
  if (!existsSync(dir)) return

  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (item.isDirectory()) {
      walk(resolve(dir, item.name), entries)
      continue
    }

    if (!isParserFile(item.name)) continue

    const file = resolve(dir, item.name)
    for (const name of extractNames(file)) {
      entries.push({ name, file })
    }
  }
}

function dedupe(entries: ParserEntry[]): ParserEntry[] {
  const byName = new Map<string, ParserEntry>()

  for (const entry of entries) {
    const previous = byName.get(entry.name)
    if (previous) {
      warn(ErrorCodes.DUPLICATE_PARSER_NAME, entry.name, previous.file, entry.file)
    }
    byName.set(entry.name, entry)
  }

  return [...byName.values()]
}

export function scanParsers(dirs: string[]): ParserEntry[] {
  const entries: ParserEntry[] = []
  for (const dir of dirs) walk(dir, entries)
  return dedupe(entries)
}
