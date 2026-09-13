# Instance

Exported from `usewagen`.

## createWagen

```ts
function createWagen(config?: WagenConfig): Wagen
```

Creates the instance that holds the parsers, the storage instances and the defaults the
composables fall back to, and returns a Vue plugin. Installing it is optional: without it the
first call creates an instance with the defaults below.

```ts
import { createApp } from 'vue'
import { createWagen } from 'usewagen'

const wagen = createWagen({
  storage: { prefix: 'app:' },
  router: { history: 'push' },
})

createApp(App).use(router).use(wagen).mount('#app')
```

### parsers

| Option    | Type                     | Default | Description                                        |
| --------- | ------------------------ | ------- | -------------------------------------------------- |
| `parsers` | `Record<string, Parser>` | `{}`    | The parsers that can be used as `{ name: '...' }`. |

Built-in names are always available and do not belong here. See
[Named parsers](/api/parsers#named-parsers).

### storage

| Option     | Type                       | Default                               | Description                                                                           |
| ---------- | -------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| `prefix`   | `string`                   | `''`                                  | Put in front of every key, and what `keys` and `clear` treat as their own.            |
| `crossTab` | `boolean`                  | `true` for local, `false` for session | Whether a write in another tab updates the refs here.                                 |
| `default`  | `'local' \| 'session'`     | `'local'`                             | The storage `useStorage` picks when a call names none.                                |
| `mode`     | `'optimistic' \| 'source'` | `'optimistic'`                        | The default [mode](/api/storage#mode) of storage state.                               |
| `onError`  | `(error: unknown) => void` | none                                  | Called when the browser refuses an operation. Without it the failure passes silently. |
| `local`    | `StorageInstance`          | the built-in local instance           | Replaces the local storage entirely.                                                  |
| `session`  | `StorageInstance`          | the built-in session instance         | Replaces the session storage entirely.                                                |

```ts
import { createMemoryStorage } from 'usewagen/storage'

createWagen({ storage: { session: createMemoryStorage() } })
```

### router

| Option           | Type                       | Default        | Description                                                       |
| ---------------- | -------------------------- | -------------- | ----------------------------------------------------------------- |
| `history`        | `'push' \| 'replace'`      | `'replace'`    | How a write navigates.                                            |
| `source`         | `'query' \| 'params'`      | `'query'`      | Which part of the route a state reads.                            |
| `clearOnDefault` | `boolean`                  | `true`         | Remove a param equal to the parser default instead of writing it. |
| `mode`           | `'optimistic' \| 'source'` | `'optimistic'` | The default [mode](/api/router#mode) of route state.              |

Each is the default for every route state that does not set its own.

## useWagen

```ts
function useWagen(): Wagen
```

Returns the active instance inside a component. It warns in development when called outside
an injection context.

```ts
import { useWagen } from 'usewagen'

const { storage } = useWagen()

storage.local.keys()
storage.default.clear({ except: ['theme'] })
```

## getActiveWagen

```ts
function getActiveWagen(): Wagen
```

The same, for code outside a component. Returns the installed instance, or creates one with
the defaults when there is none.

## defineWagenConfig

```ts
function defineWagenConfig(config: WagenConfig): WagenConfig
```

Returns the config it is given, so it can live in its own file with its types intact.

```ts [wagen.config.ts]
import { defineWagenConfig } from 'usewagen'

export default defineWagenConfig({
  storage: { prefix: 'app:' },
})
```

## Wagen

| Member    | Type                           | Description                                                               |
| --------- | ------------------------------ | ------------------------------------------------------------------------- |
| `parsers` | `Record<string, Parser>`       | The parsers registered by name.                                           |
| `storage` | `WagenStorage`                 | `local`, `session`, `default` and the resolved `mode`.                    |
| `router`  | `Required<WagenRouterOptions>` | The resolved router defaults.                                             |
| `install` | `(app: App) => void`           | Called by `app.use`.                                                      |
| `destroy` | `() => void`                   | Releases the storage instances it created and clears the active instance. |
