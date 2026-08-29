# usewagen

Type-safe composables to sync Vue state with the router and storage.

- **One source of truth.** A value lives in the URL or in the storage itself, never in a
  shadow copy beside it. Every read goes straight to the source, so nothing drifts.
- **Typed through parsers.** A parser decides how a value is read and written, and the
  composable's return type follows from it.
- **Reactive options.** Keys, storage targets and history modes can all be refs or
  getters, so a piece of state can follow the current user, tenant or route.
- **Batched navigation.** Several route params can be written in a single navigation.

## Install

```sh
pnpm add usewagen
```

`vue` is a peer dependency; `vue-router` is required only for the router composables.

## Setup

```ts
import { createApp } from 'vue'
import { createWagen } from 'usewagen'
import App from './App.vue'

const wagen = createWagen({
  storage: { prefix: 'app:' },
  router: { history: 'replace' },
})

createApp(App).use(router).use(wagen).mount('#app')
```

The plugin is optional — without it the composables fall back to sensible defaults — but
installing it is what lets you configure storage prefixes, register custom parsers and
change router defaults in one place.

## Route state

```vue
<script setup lang="ts">
import { parseAsInteger, parseAsString } from 'usewagen'
import { useRouteState } from 'usewagen/router'

const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
const q = useRouteState({ key: 'q', parser: parseAsString })
</script>

<template>
  <input v-model="q" />
  <button @click="page++">Next</button>
</template>
```

`page` is a `Ref<number>` backed by `?page=`. Writing to it navigates; the URL stays the
only place the value lives.

| Option           | Default         | What it does                                        |
| ---------------- | --------------- | --------------------------------------------------- |
| `key`            | required        | Local name of the state, and the default `urlKey`   |
| `parser`         | `parseAsString` | How the value is read from and written to the URL   |
| `urlKey`         | `key`           | The actual query param or route param name          |
| `source`         | `'query'`       | `'query'` or `'params'`                             |
| `history`        | `'replace'`     | `'replace'` or `'push'`                             |
| `clearOnDefault` | `true`          | Drop the param instead of writing the default value |

### Several params in one navigation

```ts
import { parseAsArrayOf, parseAsInteger, parseAsString } from 'usewagen'
import { useRouteStates } from 'usewagen/router'

const filters = useRouteStates([
  { key: 'page', parser: parseAsInteger.withDefault(1) },
  { key: 'q' },
  { key: 'tags', parser: parseAsArrayOf(parseAsString) },
])

filters.page.value // number
filters.set({ page: 1, q: 'vue' }) // one navigation, not three
filters.reset() // every key back to its default
filters.toObject() // { page: 1, q: 'vue', tags: [...] }
```

Each key becomes its own ref, typed from its parser. `set` and `reset` take an optional
`{ history }` override.

### The hash

```ts
import { useRouteHash } from 'usewagen/router'

const hash = useRouteHash() // Ref<string | null>, '#section' included
```

## Storage state

```ts
import { parseAsJson } from 'usewagen'
import { useLocalStorage, useSessionStorage, useStorage } from 'usewagen/storage'

const theme = useLocalStorage({ key: 'theme' })
const draft = useSessionStorage({ key: 'draft', parser: parseAsJson<Draft>() })
```

`useStorage` is the general form and takes an explicit `storage`, either `'local'`,
`'session'` or a storage instance:

```ts
const seen = useStorage({ key: 'seen', storage: 'session' })
```

Writes are synchronous, every read goes straight to the storage, and other tabs are
picked up through the native `storage` event (local storage only, on by default).

### A definition without Vue

`defineStorageState` builds the same state outside of a component, which is useful at
module level or in plain functions. Pass it to `useStorage` to get a ref over it:

```ts
import { defineStorageState, useStorage } from 'usewagen/storage'

export const themeState = defineStorageState({ key: 'theme' })

themeState.get()
themeState.set('dark')

// in a component
const theme = useStorage(themeState)
```

## Reactive options

Every option can be a value, a `ref` or a getter, and the whole options object can be one
too. This is what makes the composables worth being composables: state can follow data
that is only known at runtime.

```ts
const user = useCurrentUser()

const config = useLocalStorage({
  key: () => `config:${user.value.id}`,
  parser: parseAsJson<Config>(),
})
```

When the key changes the ref reads the new slot, its subscription moves with it, and the
old slot is left untouched — nothing is migrated. The same applies to the storage target:

```ts
const draft = useStorage({
  key: 'draft',
  storage: () => (isGuest.value ? 'session' : 'local'),
})
```

On the router side `urlKey`, `source`, `history` and `clearOnDefault` are reactive, and
`set`/`reset` read them at call time:

```ts
const page = useRouteState({
  key: 'page',
  urlKey: () => `${tenant.value}_page`,
  parser: parseAsInteger.withDefault(1),
})
```

Two options stay static by design:

- `parser`, because it determines the ref's value type, which cannot change at runtime.
- `key` in `useRouteStates`, because it names the returned ref (`filters.page`). It is an
  identifier in your source, not data — use `urlKey` for the part that varies.

## Parsers

Built-in: `parseAsString`, `parseAsInteger`, `parseAsFloat`, `parseAsIndex` (1-based in
the URL, 0-based in code), `parseAsBoolean`, `parseAsDate` (also `.iso()` and
`.timestamp()`), `parseAsStringLiteral`, `parseAsNumberLiteral`, `parseAsStringEnum`,
`parseAsArrayOf`, `parseAsJson`.

`withDefault` makes the value non-nullable and, together with `clearOnDefault`, keeps the
default out of the URL. It accepts a factory, which is re-read on every read:

```ts
const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
const size = useRouteState({
  key: 'size',
  parser: parseAsInteger.withDefault(() => settings.value.pageSize),
})
```

Write your own with `defineParser`:

```ts
import { defineParser } from 'usewagen'

export const parseAsSlug = defineParser<string>({
  parse: raw => (/^[a-z0-9-]+$/.test(raw) ? raw : null),
  serialize: value => value,
})
```

Returning `null` from `parse` means "unparseable", and the default (or `null`) is used.

### Parsers by name

The Vite plugin scans a directory for exported parsers and registers them, so they can be
referenced by name with full type inference:

```ts
// vite.config.ts
import { usewagen } from 'usewagen/vite'

export default defineConfig({
  plugins: [usewagen({ dirs: 'src/parsers' })],
})
```

```ts
import { parsers } from 'virtual:usewagen/parsers'

const wagen = createWagen({ parsers })
```

```ts
const slug = useRouteState({ key: 'slug', parser: { name: 'parseAsSlug' } })
```

The plugin writes a `usewagen.d.ts` in your project root (set `dts: false` to skip it).
Add `/// <reference types="usewagen/client" />` to your project types for the virtual
module declaration.

## Configuration

```ts
createWagen({
  parsers,
  storage: {
    prefix: 'app:', // prepended to every key
    crossTab: true, // sync local storage across tabs, default true
    onError: console.warn, // quota errors, disabled storage, ...
    default: 'local', // which one `useStorage` picks with no `storage`
  },
  router: {
    history: 'replace',
    source: 'query',
    clearOnDefault: true,
  },
})
```

`useWagen()` returns the active instance inside a component. Storage instances can also be
built directly with `createLocalStorage`, `createSessionStorage`, `createMemoryStorage` or
`createStorage` for a custom adapter.

## License

[MIT](./LICENSE)
