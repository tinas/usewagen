# Configuration

`createWagen` collects the defaults for every composable in the app. It is optional, and
without it the composables fall back to the same defaults on their own.

```ts
import { createApp } from 'vue'
import { createWagen } from 'usewagen'
import App from './App.vue'

const wagen = createWagen({
  storage: { prefix: 'app:' },
  router: { history: 'push' },
})

createApp(App).use(wagen).mount('#app')
```

## parsers

- **Type** `Record<string, Parser<any>>`
- **Default** `{}`

The parsers that can be used by name, as in `{ name: 'parseAsSlug' }`. The built-in parsers
are always available and do not need to be listed here.

## Storage options

### prefix

- **Type** `string`
- **Default** `''`

Put in front of every key. It keeps one app out of another's entries on the same origin,
and it decides which entries `keys` and `clear` consider their own.

### crossTab

- **Type** `boolean`
- **Default** `true` for local storage

Whether a write in another tab updates the refs in this one, which the browser reports
through the `storage` event. Session storage is per tab, so this does nothing there.

### default

- **Type** `'local' | 'session'`
- **Default** `'local'`

The storage `useStorage` picks when a call does not name one.

### onError

- **Type** `(error: unknown) => void`
- **Default** none

Called when the browser refuses an operation, which happens when the quota is full or when
storage is disabled. Without a handler these errors pass silently and the value is simply
not written.

### local and session

- **Type** `StorageInstance`
- **Default** the built-in instances

Replaces a storage entirely, which is how you swap in memory storage on the server or a
storage of your own.

```ts
import { createMemoryStorage } from 'usewagen/storage'

createWagen({ storage: { session: createMemoryStorage() } })
```

## Router options

### history

- **Type** `'push' | 'replace'`
- **Default** `'replace'`

How a write navigates, for every route state that does not set its own.

### source

- **Type** `'query' | 'params'`
- **Default** `'query'`

Where route state is read from by default.

### clearOnDefault

- **Type** `boolean`
- **Default** `true`

Whether a value equal to the parser default is removed instead of written.

## Reading the instance

`useWagen` returns the active instance inside a component. It carries the parsers you
registered, the resolved router defaults and the storage instances behind the composables.

```ts
import { useWagen } from 'usewagen'

const { storage, router, parsers } = useWagen()

storage.local.keys()
storage.default.clear({ except: ['theme'] })
```

Outside of a component there is `getActiveWagen`, which returns the installed instance, or
creates one with the defaults if the plugin was never used.

`wagen.destroy()` releases the storage instances it created and clears the active instance,
which is what a test wants between two cases.

## Splitting the config

`defineWagenConfig` returns the object it is given and does nothing else. It is there so a
config can live in its own file with its types intact.

```ts [wagen.config.ts]
import { defineWagenConfig } from 'usewagen'

export default defineWagenConfig({
  storage: { prefix: 'app:' },
})
```
