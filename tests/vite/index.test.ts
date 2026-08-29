import type { Plugin } from 'vite'

import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { existsSync, readFileSync } from 'node:fs'
import { rmSync } from 'node:fs'

import { PARSERS_ID, RESOLVED_PARSERS_ID, usewagen } from '../../src/vite'
import type { WagenPluginOptions } from '../../src/vite'
import { createFixtures } from './__helpers__'

const { root: fixtureRoot, parsersDir, dtsPath, writeParser, clean } = createFixtures('plugin')

type WatchListener = (event: string, path: string) => void

function setup(options: WagenPluginOptions = { dirs: parsersDir, dts: dtsPath }) {
  const plugin = usewagen(options)
  const watched: string[] = []

  const configResolved = plugin.configResolved as (config: { root: string }) => void
  configResolved({ root: fixtureRoot })

  const rawLoad = plugin.load as (this: unknown, id: string) => string | undefined
  const rawResolveId = plugin.resolveId as (id: string) => string | undefined

  return {
    plugin,
    watched,
    resolveId: (id: string) => rawResolveId(id),
    load: (id: string = RESOLVED_PARSERS_ID) =>
      rawLoad.call({ addWatchFile: (file: string) => watched.push(file) }, id),
  }
}

function fakeServer() {
  const listeners: WatchListener[] = []
  const added: string[] = []
  const invalidated: unknown[] = []
  const sent: unknown[] = []
  const mod = { id: RESOLVED_PARSERS_ID }
  let known = true

  const server = {
    watcher: {
      add: (dir: string) => added.push(dir),
      on: (_event: string, listener: WatchListener) => listeners.push(listener),
    },
    moduleGraph: {
      getModuleById: (id: string) => (known && id === RESOLVED_PARSERS_ID ? mod : undefined),
      invalidateModule: (target: unknown) => invalidated.push(target),
    },
    ws: { send: (payload: unknown) => sent.push(payload) },
  }

  return {
    server,
    added,
    invalidated,
    sent,
    mod,
    forget: () => (known = false),
    emit: (event: string, path: string) => {
      for (const listener of listeners) listener(event, path)
    },
  }
}

afterEach(() => {
  clean()
  vi.restoreAllMocks()
})

describe('plugin shape', () => {
  test('is a valid vite plugin with the expected name', () => {
    const plugin: Plugin = usewagen()

    expect(plugin.name).toBe('usewagen')
  })

  test('resolves the parsers module id and nothing else', () => {
    const { resolveId } = setup()

    expect(resolveId(PARSERS_ID)).toBe(RESOLVED_PARSERS_ID)
    expect(resolveId('usewagen')).toBeUndefined()
    expect(resolveId('virtual:usewagen')).toBeUndefined()
  })

  test('load ignores every other id', () => {
    const { load } = setup()

    expect(load('some-other-id')).toBeUndefined()
  })
})

describe('module generation', () => {
  test('serves the parsers found in the scanned directory', () => {
    writeParser('money.ts', 'export const parseAsMoney = defineParser({})')

    const content = setup().load()!

    expect(content).toContain('parseAsMoney')
    expect(content).toContain('export const parsers = {')
  })

  test('serves an empty table when the directory is missing', () => {
    const content = setup({ dirs: '/nonexistent/path', dts: false }).load()!

    expect(content).toContain('export const parsers = {}')
  })

  test('registers the scanned directories and files as watch dependencies', () => {
    const file = writeParser('money.ts', 'export const parseAsMoney = 1')

    const { load, watched } = setup()
    load()

    expect(watched).toContain(parsersDir)
    expect(watched).toContain(file)
  })

  test('resolves dirs relative to the vite root', () => {
    const file = writeParser('money.ts', 'export const parseAsMoney = 1')

    const { load, watched } = setup({ dirs: 'parsers', dts: false })
    load()

    expect(watched).toContain(file)
  })

  test('accepts several directories', () => {
    writeParser('a.ts', 'export const parseAsA = 1')
    writeParser('nested/b.ts', 'export const parseAsB = 1')

    const content = setup({ dirs: [parsersDir, `${parsersDir}/nested`], dts: false }).load()!

    expect(content).toContain('parseAsA')
    expect(content).toContain('parseAsB')
  })
})

describe('declaration file', () => {
  test('is written on configResolved', () => {
    writeParser('money.ts', 'export const parseAsMoney = 1')

    setup()

    expect(readFileSync(dtsPath, 'utf-8')).toContain('parseAsMoney')
  })

  test('is not written when dts is false', () => {
    writeParser('money.ts', 'export const parseAsMoney = 1')

    setup({ dirs: parsersDir, dts: false })

    expect(existsSync(dtsPath)).toBe(false)
  })

  test('is left untouched when the content would not change', () => {
    writeParser('money.ts', 'export const parseAsMoney = 1')

    setup()
    const first = readFileSync(dtsPath, 'utf-8')

    setup()

    expect(readFileSync(dtsPath, 'utf-8')).toBe(first)
  })
})

describe('hot updates', () => {
  test('watches the configured directories', () => {
    const { plugin } = setup()
    const harness = fakeServer()

    ;(plugin.configureServer as (server: unknown) => void)(harness.server)

    expect(harness.added).toContain(parsersDir)
  })

  test('rescans, rewrites the dts and reloads on a parser change', () => {
    writeParser('money.ts', 'export const parseAsMoney = 1')

    const { plugin, load } = setup()
    expect(load()).toContain('parseAsMoney')

    const harness = fakeServer()
    ;(plugin.configureServer as (server: unknown) => void)(harness.server)

    writeParser('money.ts', 'export const parseAsCurrency = 1')
    harness.emit('change', `${parsersDir}/money.ts`)

    expect(load()).toContain('parseAsCurrency')
    expect(load()).not.toContain('parseAsMoney')
    expect(readFileSync(dtsPath, 'utf-8')).toContain('parseAsCurrency')
    expect(harness.invalidated).toEqual([harness.mod])
    expect(harness.sent).toEqual([{ type: 'full-reload' }])
  })

  test('picks up a newly added parser file', () => {
    writeParser('money.ts', 'export const parseAsMoney = 1')

    const { plugin, load } = setup()
    load()

    const harness = fakeServer()
    ;(plugin.configureServer as (server: unknown) => void)(harness.server)

    const added = writeParser('tax.ts', 'export const parseAsTax = 1')
    harness.emit('add', added)

    expect(load()).toContain('parseAsTax')
  })

  test('drops a removed parser file', () => {
    const file = writeParser('money.ts', 'export const parseAsMoney = 1')

    const { plugin, load } = setup()
    load()

    const harness = fakeServer()
    ;(plugin.configureServer as (server: unknown) => void)(harness.server)

    rmSync(file)
    harness.emit('unlink', file)

    expect(load()).not.toContain('parseAsMoney')
  })

  test('ignores paths outside the scanned directories', () => {
    const { plugin } = setup()
    const harness = fakeServer()

    ;(plugin.configureServer as (server: unknown) => void)(harness.server)

    harness.emit('change', `${fixtureRoot}/elsewhere.ts`)
    harness.emit('change', `${parsersDir}/notes.md`)
    harness.emit('change', `${parsersDir}/types.d.ts`)

    expect(harness.sent).toEqual([])
  })

  test('ignores watcher events it does not act on', () => {
    writeParser('money.ts', 'export const parseAsMoney = 1')

    const { plugin } = setup()
    const harness = fakeServer()

    ;(plugin.configureServer as (server: unknown) => void)(harness.server)

    harness.emit('addDir', `${parsersDir}/nested`)

    expect(harness.sent).toEqual([])
  })

  test('does not reload when the module was never requested', () => {
    writeParser('money.ts', 'export const parseAsMoney = 1')

    const { plugin } = setup()
    const harness = fakeServer()
    harness.forget()

    ;(plugin.configureServer as (server: unknown) => void)(harness.server)

    harness.emit('change', `${parsersDir}/money.ts`)

    expect(harness.sent).toEqual([])
    expect(readFileSync(dtsPath, 'utf-8')).toContain('parseAsMoney')
  })
})
