# Vite Plugin

The plugin turns a folder of parsers into something an app can use by name. It scans the
folder, collects what it finds into one module to register, and writes the declaration that
teaches TypeScript which names exist and what each one returns.

::: info
The plugin needs Vite 7.3 or 8. Nothing else in the library does.
:::

## Setup

### 1. Add the plugin

It scans the folders you name, resolved from the Vite root.

```ts [vite.config.ts]
import { defineConfig } from 'vite'
import { usewagen } from 'usewagen/vite'

export default defineConfig({
  plugins: [usewagen({ dirs: 'src/parsers' })],
})
```

### 2. Register what it collects

The plugin serves everything it found from `virtual:usewagen/parsers`. Nothing is registered
until that module reaches `createWagen`, so this step is the one that makes the names work.

```ts [main.ts]
import { createApp } from 'vue'
import { createWagen } from 'usewagen'
import { parsers } from 'virtual:usewagen/parsers'
import App from './App.vue'

const wagen = createWagen({ parsers })

createApp(App).use(wagen).mount('#app')
```

### 3. Write parsers in the folder

```ts [src/parsers/slug.ts]
import { defineParser } from 'usewagen'

export const parseAsSlug = defineParser<string>({
  parse: raw => (/^[a-z0-9-]+$/.test(raw) ? raw : null),
})
```

From there a parser is a name, and the name carries its type.

```ts
const slug = useRouteState({ key: 'slug', parser: { name: 'parseAsSlug' } })
```

A file added to the folder while the dev server runs is picked up without a restart.

## What it picks up

The folders are walked recursively, and a file is read when it ends in `.js`, `.mjs`, `.ts`
or `.mts` and is not a declaration file. Inside it, an export counts when it is a `const`
whose name begins with `parseAs`, which is the shape a parser file has anyway.

Everything else in the file is left alone, and so is a parser exported under a name of
another shape. A commented out parser is not registered, and a name a built-in already uses
is skipped with a warning. When two files export the same name, the plugin warns and the file
read last wins.

[Vite plugin](/api/vite) lists the options.

## Types

The plugin writes `usewagen.d.ts` in the Vite root, and that file is what tells TypeScript
which parser names exist and what each one returns. All it needs is to be seen: a
`tsconfig.json` without an `include` picks it up already, and with one you add it.

```json [tsconfig.json]
{
  "include": ["src", "usewagen.d.ts"]
}
```

`dts` puts the file somewhere else, and `dts: false` stops it being written at all. Without
it the parsers still resolve by name while the app runs, but TypeScript knows the built-in
names only, so a name of your own becomes an error rather than a typed parser. Declare the
virtual module yourself in that case.

```ts [env.d.ts]
/// <reference types="usewagen/client" />
```
