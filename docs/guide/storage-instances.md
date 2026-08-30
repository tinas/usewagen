# Storage Instances

A storage instance is what the composables write through. It wraps an adapter, which is the
part that actually holds the strings, and adds the prefix, the subscriptions and the error
handling around it.

You rarely build one by hand, since the plugin creates the local and the session instance
for you. You do need one when you want a storage of your own, or when you want to reach the
entries directly.

```ts
import { createLocalStorage, createMemoryStorage, createSessionStorage } from 'usewagen/storage'

const local = createLocalStorage({ prefix: 'app:' })
const session = createSessionStorage()
const memory = createMemoryStorage()
```

All three take `prefix`, `crossTab` and `onError`, the same options the configuration takes.
Memory storage keeps everything in a `Map`, which is what you want in tests and on the
server, where the web storages are not there.

An instance can be handed to a single state, or to the whole app.

```ts
const seen = useStorage({ key: 'seen', storage: memory })

createWagen({ storage: { session: memory } })
```

## The instance

### name and prefix

- **Type** `string`

What the instance is called, `'local'`, `'session'` or `'memory'` for the ready made ones,
and the prefix every key goes through. Both are read only.

### getItem, setItem and removeItem

Read, write and remove a raw string under the prefix. A parser is not involved here, so
these are the strings as they are stored.

```ts
local.setItem('theme', 'dark')
local.getItem('theme')
local.removeItem('theme')
```

### has

- **Type** `(key: string) => boolean`

Whether the entry is there, without reading it into a value.

### keys

- **Type** `() => string[]`

The keys that belong to this instance, with the prefix taken off again. Entries written by
something else on the same origin are not listed.

### clear

- **Type** `(options?: { except?: string[] }) => void`

Removes every key of this instance, which is where the prefix earns its keep. `except`
keeps the keys you name, written the way you write them everywhere else, without the prefix.

```ts
local.clear({ except: ['theme'] })
```

### subscribe

- **Type** `(key: string, listener: () => void) => () => void`
- **Type** `(listener: (key: string | null) => void) => () => void`

With a key, the listener runs whenever that key changes. Without one, it runs on every
change the instance makes, and is handed the key that moved, written without the prefix.
Either form returns the function that stops it again.

```ts
const stopOne = local.subscribe('theme', () => {
  document.documentElement.dataset.theme = local.getItem('theme') ?? 'light'
})

const stopAll = local.subscribe(key => {
  console.log(key, 'changed')
})
```

Changes from another tab arrive the same way, as long as `crossTab` is on. When that tab
clears the storage in one go there is no single key to report, so keyed listeners all run
and the listener without a key is given `null`.

### destroy

- **Type** `() => void`

Stops the cross tab listener and drops every subscription. `createWagen` gives you the same
through `wagen.destroy()` for the instances it made.

## A storage of your own

`createStorage` takes a name and an adapter, and gives back an instance with everything
above. The adapter is the part that holds the strings. It can be anything that answers right
away, from a `Map` you keep around to a store your host app hands you.

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

That is `createMemoryStorage` in four lines, and it is the shape every adapter has.
Everything a real store can refuse, a full quota above all, is caught for you and handed to
`onError`.

An adapter can also report changes that come from outside of it, which is what `watch` is
for. The web storages use it for the browser's `storage` event, and your own store can use
whatever it has. Below the same `Map` is kept in step across tabs with a `BroadcastChannel`:
every write is posted, and a message from another tab is applied to the map before the key
is reported.

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

`watch` is given the callback and has to return the function that stops listening. It only
runs when `crossTab` is on, and a `null` key tells the instance that everything changed at
once.
