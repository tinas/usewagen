# Vite Plugin

Exported from `usewagen/vite`.

## usewagen

```ts
function usewagen(options?: WagenPluginOptions): Plugin
```

Scans the given directories for parsers, serves them from a virtual module and writes the
declaration that teaches TypeScript their names.

```ts [vite.config.ts]
import { defineConfig } from 'vite'
import { usewagen } from 'usewagen/vite'

export default defineConfig({
  plugins: [usewagen({ dirs: 'src/parsers' })],
})
```

### Options

| Option | Type                 | Default           |
| ------ | -------------------- | ----------------- |
| `dirs` | `string \| string[]` | `'src/parsers'`   |
| `dts`  | `string \| false`    | `'usewagen.d.ts'` |

`dirs` is resolved from the Vite root and is walked recursively.

`dts` is where the declaration file is written. Point it somewhere else when your types live
in a folder, or set it to `false` to declare the names yourself. See
[Vite Plugin](/guide/vite-plugin) for what the declaration does and how TypeScript is told
about it.

## What is scanned

A file is read when it ends in `.js`, `.mjs`, `.ts` or `.mts` and is not a declaration file.
Inside it, an export is picked up when it is a `const` whose name begins with `parseAs`.

```ts [src/parsers/slug.ts]
export const parseAsSlug = defineParser<string>({
  parse: raw => (/^[a-z0-9-]+$/.test(raw) ? raw : null),
})
```

Anything else is left alone, including a parser exported under another name, a `let`, a
default export and a re-export. Commented out code is stripped before the scan, so a parser
inside a comment is not registered.

A name a built-in already uses is skipped with a warning, and a name found in two files
warns as well, where the file read last wins.

## virtual:usewagen/parsers

The module the plugin serves. It exports `parsers`, a record of everything the scan found,
keyed by the name it was exported under.

```ts [main.ts]
import { createWagen } from 'usewagen'
import { parsers } from 'virtual:usewagen/parsers'

const wagen = createWagen({ parsers })
```

A scanned file that is added, changed or removed while the dev server runs makes the plugin
scan again, rewrite the declaration and reload the page, so a new parser needs no restart.

`usewagen/client` is the declaration that says this module exists. It ships with the package
and is referenced by the generated file, so a project with `dts` on never adds it by hand.
