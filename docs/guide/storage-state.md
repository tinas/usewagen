# Storage State

Storage state keeps a value in `localStorage` or `sessionStorage`. A write is applied right
away, and a read gives back what the storage holds, unless the write never landed. That last
case is what `mode` is about.

```ts
import { parseAsJson } from 'usewagen'
import { useLocalStorage, useSessionStorage } from 'usewagen/storage'

const theme = useLocalStorage({ key: 'theme' })
const draft = useSessionStorage({ key: 'draft', parser: parseAsJson<Draft>() })
```

Setting a ref to `null` removes the entry, and a missing entry reads back as `null` unless
the parser has a default. With `clearOnDefault` on, a value equal to that default is removed
as well, rather than written out. An empty string is a value of its own, so it stays in the
storage and reads back as `''`.

`useStorage` is the general form of the two. It takes the storage to use, and falls back to
the configured default when you leave it out.

```ts
import { useStorage } from 'usewagen/storage'

const seen = useStorage({ key: 'seen', storage: 'session' })
```

## Options

### key

- **Type** `string`
- **Required**

The entry to read and write. The prefix from the configuration is added in front of it.

### storage

- **Type** `'local' | 'session' | StorageInstance`
- **Default** `'local'`

Which storage the value lives in. `useLocalStorage` and `useSessionStorage` set this for
you, so the option only appears on `useStorage`. The default follows the `default` you set
in the configuration.

### parser

- **Type** `Parser<T>`
- **Default** `parseAsString`

Turns the stored string into a value and back, and decides the type of the ref. Objects and
arrays need `parseAsJson`, since storage holds strings only.

### clearOnDefault

- **Type** `boolean`
- **Default** `true`

When the parser has a default and the value is equal to it, the entry is removed instead of
written out, since a missing entry reads as that default anyway. Turn it off and the value
is written like any other.

### mode

- **Type** `'optimistic' | 'source'`
- **Default** `'optimistic'`

Whether the state keeps a copy of what you wrote.

A browser can refuse a write when the quota is full, or when storage is disabled for the
origin.
With `'optimistic'` the ref still reads back the value you assigned, so it behaves like a
`ref` that happens to persist, and `onError` is where you learn the write did not land.

```ts
const theme = useLocalStorage({ key: 'theme' })

theme.value = 'dark'
theme.value // 'dark', even if the quota refused it
```

With `'source'` every read goes to the storage, so a refused write leaves the ref on the
value that is actually stored. Use it when showing a value that is not really there would be
worse than showing a stale one.

Either way a later write from anywhere else wins over the copy, whether it comes from another
tab, another ref, or the storage instance directly, so a ref can never be left behind.

## Other tabs

Local storage instances listen to the native `storage` event, so a value written in one tab
updates the refs in the others. Session storage is per tab, so nothing is shared there.

You can turn the listener off with `crossTab: false` in the configuration.

## Outside of a component

`defineStorageState` builds the same state without Vue. It is useful at module level, in a
plain function or in a store.

```ts
import { defineStorageState, useStorage } from 'usewagen/storage'

export const themeState = defineStorageState({ key: 'theme' })

themeState.get()
themeState.set('dark')
themeState.remove()
```

It takes the same options as `useStorage`, with plain values instead of refs and getters.
The copy that `mode` describes lives on the state, so every ref built over one state agrees
with it and with the others.

### get and set

Read the value through the parser, and write it back the same way. `set(null)` removes the
entry, exactly as it does through a ref.

### remove

Removes the entry outright, whatever the parser and `clearOnDefault` would have decided.

### subscribe

Runs a listener whenever the entry changes and returns the function that stops it again.
This is what `useStorage` uses to keep its ref up to date.

### key and storage

The key as you wrote it, and the storage instance the state reads from. Both are read only,
and `storage` resolves the `'local'` or `'session'` you passed to a real instance.

Pass the state to `useStorage` to get a ref over it, which is the same state seen from a
component.

```ts
const theme = useStorage(themeState)
```
