# Configuration

`createWagen` is where an app decides once what every state would otherwise repeat. It is
optional: without it the composables use the same defaults, and the first call creates an
instance on its own.

```ts [main.ts]
import { createApp } from 'vue'
import { createWagen } from 'usewagen'
import App from './App.vue'

const wagen = createWagen({
  storage: { prefix: 'app:', onError: error => report(error) },
  router: { history: 'push' },
})

createApp(App).use(wagen).mount('#app')
```

A `prefix` is the one setting an app with any storage state wants. It keeps the entries of
this app apart from everything else on the origin, and it is what makes `keys` and `clear`
able to tell which entries belong here. `onError` is the only report of a storage write the
browser refused, and `history` is where an app decides whether its URL changes are steps the
back button undoes.

The configuration is also where a storage is replaced outright, which is how a test or a
server run swaps in something that is not the browser's.

```ts
import { createMemoryStorage } from 'usewagen/storage'

createWagen({ storage: { session: createMemoryStorage() } })
```

Parsers used by name are registered here as well. See
[Parsers](/guide/parsers#using-a-parser-by-name).

[Instance](/api/wagen) lists every option with its default.

## Reading the instance

`useWagen` hands a component the active instance, which carries the registered parsers, the
resolved router defaults and the storage instances the composables write through.

```ts
import { useWagen } from 'usewagen'

const { storage } = useWagen()

storage.local.keys()
storage.default.clear({ except: ['theme'] })
```

Outside a component, `getActiveWagen` returns the installed instance, or creates one with the
defaults when there is none.

`wagen.destroy()` releases the storage instances the instance created and clears it as the
active one, which is what a test does between two cases.

## Keeping the config elsewhere

`defineWagenConfig` returns the object it is given, and exists so that a configuration can
live in its own file without losing its types.

```ts [wagen.config.ts]
import { defineWagenConfig } from 'usewagen'

export default defineWagenConfig({
  storage: { prefix: 'app:' },
})
```
