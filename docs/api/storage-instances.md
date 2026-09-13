# Storage Instances

Exported from `usewagen/storage`. An instance wraps an adapter, which holds the strings, and
adds the prefix, the subscriptions and the error handling the states rely on.

## createLocalStorage

```ts
function createLocalStorage(config?: StorageConfig): StorageInstance
```

An instance over `window.localStorage`, with `crossTab` on.

## createSessionStorage

```ts
function createSessionStorage(config?: StorageConfig): StorageInstance
```

An instance over `window.sessionStorage`.

## createMemoryStorage

```ts
function createMemoryStorage(config?: StorageConfig): StorageInstance
```

An instance over a `Map`.

Where the browser refuses to hand over a web storage, the two web instances warn and fall
back to memory. Where there is no `window`, as on the server, they fall back to a storage
that holds nothing: reads give the parser default and writes are dropped.

## createStorage

```ts
function createStorage(name: string, options: StorageAdapter & StorageConfig): StorageInstance
```

Builds an instance over an adapter of your own. See
[A storage of your own](/guide/storage-instances#a-storage-of-your-own).

### StorageConfig

| Option     | Type                       | Default | Description                                    |
| ---------- | -------------------------- | ------- | ---------------------------------------------- |
| `prefix`   | `string`                   | `''`    | Added to every key before the adapter sees it. |
| `crossTab` | `boolean`                  | `false` | Whether `watch` is subscribed to.              |
| `onError`  | `(error: unknown) => void` | none    | Called with whatever the adapter throws.       |

### StorageAdapter

| Member       | Type                                                       | Description                                         |
| ------------ | ---------------------------------------------------------- | --------------------------------------------------- |
| `getItem`    | `(key: string) => string \| null`                          | The raw string, or `null`.                          |
| `setItem`    | `(key: string, value: string) => void`                     | Writes the raw string.                              |
| `removeItem` | `(key: string) => void`                                    | Removes the entry.                                  |
| `keys`       | `() => string[]`                                           | Every key the store holds, prefixes included.       |
| `watch`      | `(onChange: (key: string \| null) => void) => Unsubscribe` | Optional. Reports changes made outside the adapter. |

The keys an adapter is given carry the prefix, which is why `keys` returns them that way.
`watch` has to return the function that stops listening, and a `null` key means everything
changed at once.

## StorageInstance

| Member       | Type                                                       | Description                                                       |
| ------------ | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `name`       | `string`                                                   | `'local'`, `'session'`, `'memory'` or the name you gave it.       |
| `prefix`     | `string`                                                   | The prefix every key goes through.                                |
| `getItem`    | `(key: string) => string \| null`                          | The raw string under the prefix, without a parser.                |
| `setItem`    | `(key: string, value: string) => void`                     | Writes a raw string and notifies the listeners for that key.      |
| `removeItem` | `(key: string) => void`                                    | Removes the entry and notifies the same listeners.                |
| `has`        | `(key: string) => boolean`                                 | Whether the entry is there.                                       |
| `keys`       | `() => string[]`                                           | The keys of this instance, prefix removed.                        |
| `clear`      | `(options?: { except?: string[] }) => void`                | Removes every key of this instance, keeping the ones in `except`. |
| `subscribe`  | `(key: string, listener: () => void) => Unsubscribe`       | Runs the listener when that key changes.                          |
| `subscribe`  | `(listener: (key: string \| null) => void) => Unsubscribe` | Runs the listener on every change, with the key that moved.       |
| `destroy`    | `() => void`                                               | Stops the cross tab listener and drops every subscription.        |

Keys outside the prefix belong to something else on the origin, so `keys` does not list them
and `clear` does not touch them. A write that changes nothing notifies nobody.
