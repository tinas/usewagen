# Storage Instances

A storage instance is what a storage state writes through. It wraps an adapter, which is the
part that actually holds the strings, and adds the prefix, the subscriptions and the error
handling that the states rely on.

The local and the session instance are created for you, so an instance is something you
build only to reach the entries directly or to put a store of your own behind them.

```ts
import { createLocalStorage, createMemoryStorage, createSessionStorage } from 'usewagen/storage'

const local = createLocalStorage({ prefix: 'app:' })
const memory = createMemoryStorage()
```

All three take `prefix`, `crossTab` and `onError`, the options the configuration takes.
Memory storage keeps everything in a `Map`, which is what a test wants and what the server
has instead of a browser storage.

An instance can back a single state or the whole app.

```ts
const seen = useStorage({ key: 'seen', storage: memory })

createWagen({ storage: { session: memory } })
```

## Reaching the entries

An instance reads and writes raw strings, with no parser in the way, under the prefix it was
given.

```ts
local.setItem('theme', 'dark')
local.getItem('theme') // 'dark'
local.has('theme') // true
local.keys() // ['theme']
```

`keys` returns the keys without the prefix, and lists only what belongs to this instance, so
an entry another app wrote on the same origin is not in it. `clear` follows the same rule,
which is what makes a sign out safe to write.

```ts
local.clear({ except: ['theme'] })
```

`subscribe` reports changes, either for one key or for all of them, and returns the function
that stops listening.

```ts
const stop = local.subscribe('theme', () => {
  document.documentElement.dataset.theme = local.getItem('theme') ?? 'light'
})
```

Changes made in another tab arrive the same way as local ones. When a tab clears its storage
in one go there is no single key to report, so every keyed listener runs and a listener
without a key is handed `null`.

[Storage instances](/api/storage-instances) lists every member.

## A storage of your own

`createStorage` takes a name and an adapter and gives back an instance with everything above.
The adapter is four functions over something that answers right away, from a `Map` you keep
around to a store the host application hands you.

```ts
import { createStorage } from 'usewagen/storage'

const store = new Map<string, string>()

const shared = createStorage('shared', {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => void store.set(key, value),
  removeItem: key => void store.delete(key),
  keys: () => [...store.keys()],
  prefix: 'app:',
})
```

That is memory storage in four lines, and every adapter has that shape. The keys an adapter
sees carry the prefix, which is why `keys` gives them back that way. Anything the store
throws, a full quota above all, is caught and handed to `onError` instead of reaching the
component.

A store that can change on its own reports it through `watch`, which is subscribed to when
`crossTab` is on and has to return the function that stops listening. The web storages use it
for the browser's `storage` event. Below, the same `Map` is kept in step across tabs with a
`BroadcastChannel`: every write is posted, and a message from another tab is applied to the
map before the key is reported.

```ts
const channel = new BroadcastChannel('shared')

const shared = createStorage('shared', {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => {
    store.set(key, value)
    channel.postMessage([key, value])
  },
  removeItem: key => {
    store.delete(key)
    channel.postMessage([key, null])
  },
  keys: () => [...store.keys()],
  crossTab: true,
  watch: onChange => {
    channel.onmessage = ({ data: [key, value] }) => {
      if (value === null) store.delete(key)
      else store.set(key, value)
      onChange(key)
    }
    return () => channel.close()
  },
})
```

A `null` key passed to `onChange` says that everything changed at once.

`destroy` stops the cross tab listener and drops every subscription an instance holds.
`wagen.destroy()` does it for the instances it created.
