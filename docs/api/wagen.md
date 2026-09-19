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

### missing

| Option    | Type      | Default | Description                                                                                                  |
| --------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `missing` | `Missing` | `null`  | What a state without a default reads when its source holds nothing usable, and what removes it when written. |

The option accepts only the type [Register](#register) names, and is required once `Register`
names one. While `Register` is empty, `undefined` passes as it does through any optional
option, so that one value is kept in step with its type by hand. Every state that does not
set its own `missing` falls back to it. See
[The missing value](/guide/configuration#the-missing-value).

```ts
createWagen({ missing: undefined })
```

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
| `missing` | `Missing`                      | The missing value the states fall back to.                                |
| `storage` | `WagenStorage`                 | `local`, `session`, `default` and the resolved `mode`.                    |
| `router`  | `Required<WagenRouterOptions>` | The resolved router defaults.                                             |
| `install` | `(app: App) => void`           | Called by `app.use`.                                                      |
| `destroy` | `() => void`                   | Releases the storage instances it created and clears the active instance. |

## Register

```ts
interface Register {}
```

The interface an app augments to change the types the library resolves. `missing` is the type
of the missing value, and has to match the value given to [createWagen](#missing). The file
has to be a module, hence the `export {}`, and it is not the `usewagen.d.ts` the
[Vite plugin](/api/vite) writes, since that one is regenerated.

```ts [env.d.ts]
export {}

declare module 'usewagen' {
  interface Register {
    missing: undefined
  }
}
```

## Missing

```ts
type Missing = Register extends { missing: infer M } ? M : null
```

The type of the missing value: what `Register` names, or `null`. It is what every
`Ref<T | null>` on these pages becomes once `Register` says otherwise.
