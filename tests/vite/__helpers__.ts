import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'

export interface Fixtures {
  readonly root: string
  readonly parsersDir: string
  readonly dtsPath: string
  writeParser: (name: string, content: string) => string
  clean: () => void
}

export function createFixtures(namespace: string): Fixtures {
  const root = mkdtempSync(resolve(tmpdir(), `usewagen-${namespace}-`))
  const parsersDir = resolve(root, 'parsers')

  return {
    root,
    parsersDir,
    dtsPath: resolve(root, 'usewagen.d.ts'),
    writeParser(name, content) {
      const target = resolve(parsersDir, name)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, content, 'utf-8')
      return target
    },
    clean() {
      rmSync(root, { recursive: true, force: true })
    },
  }
}
