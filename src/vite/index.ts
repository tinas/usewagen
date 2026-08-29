import type { Plugin } from 'vite'
import type { ParserEntry } from './scan'

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { generateDeclaration, generateModule } from './generate'
import { isParserFile, scanParsers } from './scan'

export const PARSERS_ID = 'virtual:usewagen/parsers'
export const RESOLVED_PARSERS_ID = `\0${PARSERS_ID}`

export interface WagenPluginOptions {
  /**
   * Directory or directories to scan for parser files.
   * @default 'src/parsers'
   */
  dirs?: string | string[]
  /**
   * Output path for the generated `.d.ts` file, or `false` to disable.
   * @default 'usewagen.d.ts'
   */
  dts?: string | false
}

function contains(dir: string, path: string): boolean {
  const target = relative(dir, path)
  return !isAbsolute(target) && !target.startsWith(`..${sep}`)
}

export function usewagen(options: WagenPluginOptions = {}): Plugin {
  const { dirs: rawDirs = 'src/parsers', dts = 'usewagen.d.ts' } = options

  let dirs: string[] = []
  let dtsPath = ''
  let entries: ParserEntry[] | null = null

  function scan(): ParserEntry[] {
    entries ??= scanParsers(dirs)
    return entries
  }

  function writeDeclaration(): void {
    if (dts === false) return

    const content = generateDeclaration(scan(), dtsPath)
    const dir = dirname(dtsPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const existing = existsSync(dtsPath) ? readFileSync(dtsPath, 'utf-8') : ''
    if (existing !== content) writeFileSync(dtsPath, content, 'utf-8')
  }

  function isScanned(path: string): boolean {
    return dirs.some(dir => contains(dir, path)) && isParserFile(basename(path))
  }

  return {
    name: 'usewagen',

    configResolved(config) {
      const list = Array.isArray(rawDirs) ? rawDirs : [rawDirs]
      dirs = list.map(dir => resolve(config.root, dir))
      if (dts !== false) dtsPath = resolve(config.root, dts)

      entries = null
      writeDeclaration()
    },

    resolveId(id) {
      if (id === PARSERS_ID) return RESOLVED_PARSERS_ID
    },

    load(id) {
      if (id !== RESOLVED_PARSERS_ID) return

      const found = scan()
      for (const dir of dirs) this.addWatchFile(dir)
      for (const { file } of found) this.addWatchFile(file)

      return generateModule(found)
    },

    configureServer(server) {
      for (const dir of dirs) server.watcher.add(dir)

      server.watcher.on('all', (event, path) => {
        if (event !== 'add' && event !== 'unlink' && event !== 'change') return
        if (!isScanned(path)) return

        entries = null
        writeDeclaration()

        const mod = server.moduleGraph.getModuleById(RESOLVED_PARSERS_ID)
        if (!mod) return

        server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      })
    },
  }
}

export default usewagen
