# usewagen

Type-safe composables to sync Vue state with router and storage.

## Vite plugin

`usewagen` ships with a Vite plugin that auto-discovers your custom parsers, registers them with the runtime registry, and generates a `.d.ts` file so named parsers (e.g. `{ name: 'parseAsMoney' }`) are fully type-safe across your app.

### Setup

Add the plugin to your Vite config:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { usewagen } from 'usewagen/vite'

export default defineConfig({
  plugins: [vue(), usewagen()],
})
```

Import the virtual module once at your app entry so the parsers get registered before any composable runs:

```ts
// src/main.ts
import 'virtual:usewagen'

import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

Include the generated declaration file in your `tsconfig.json`:

```jsonc
{
  "include": ["src", "usewagen.d.ts"],
}
```

Add it to your `.gitignore` — it is regenerated on every dev/build:

```
usewagen.d.ts
```

### Writing parsers

Any file under the scanned directory that exports a `parseAs*` constant is picked up automatically:

```ts
// src/parsers/pagination.ts
import { defineParser, parseAsStringLiteral } from 'usewagen'

export const parseAsPage = defineParser({
  parse: raw => Number(raw),
  serialize: value => String(value),
})

export const parseAsSort = parseAsStringLiteral(['asc', 'desc'])
```

You can now reference them by name with full type inference:

```ts
import { useRouteState } from 'usewagen/router'

const page = useRouteState({
  key: 'page',
  parser: { name: 'parseAsPage', defaultValue: 1 }, // typed as number
})

const sort = useRouteState({
  key: 'sort',
  parser: { name: 'parseAsSort', defaultValue: 'asc' }, // typed as 'asc' | 'desc'
})
```

Notes:

- Only top-level `export const parseAs*` declarations are registered. Factory functions (`export function parseAsCustom(...)`) are ignored — call them at the site where you need a specialized instance.
- Names that collide with built-in parsers (e.g. `parseAsString`, `parseAsInteger`) are skipped with a warning.
- Nested folders under the scanned directory are traversed recursively.

### Options

```ts
usewagen({
  // Directory (or list of directories) to scan for parser files.
  // Paths are resolved relative to the Vite root.
  dirs: 'src/parsers', // default

  // Where to write the generated declaration file.
  // Pass `false` to disable .d.ts generation.
  dts: 'usewagen.d.ts', // default
})
```

Multiple directories:

```ts
usewagen({
  dirs: ['src/parsers', 'src/features/parsers'],
})
```

Disable declaration output (e.g. in JS projects):

```ts
usewagen({ dts: false })
```

The generated declaration file also types the `virtual:usewagen` side-effect
import. If you set `dts: false` in a TypeScript project, add the reference
yourself:

```ts
/// <reference types="usewagen/client" />
```
