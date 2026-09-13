# Storage

Exported from `usewagen/storage`.

## useStorage

```ts
function useStorage<P extends ParserInput | undefined = undefined>(
  options: UseStorageOptions<P>,
): Ref<InferInputValue<P>, InferInputWritable<P>>

function useStorage<T, W>(state: StorageState<T, W>): Ref<T, W>
```

Keeps one value in a browser storage and returns a ref over it. The second form takes a
state built with [defineStorageState](#definestoragestate).

```ts
import { parseAsJson } from 'usewagen'
import { useStorage } from 'usewagen/storage'

const seen = useStorage({ key: 'seen', storage: 'session' })
const draft = useStorage({ key: 'draft', parser: parseAsJson<Draft>() })
```

The options object, and every option in it, accepts a value, a `ref`, a `computed` or a
getter. See [Reactive Options](/guide/reactive-options).

### Options

| Option           | Type                                      | Default         | Description                                                              |
| ---------------- | ----------------------------------------- | --------------- | ------------------------------------------------------------------------ |
| `key`            | `string`                                  | required        | The entry to read and write, written without the configured prefix.      |
| `storage`        | `'local' \| 'session' \| StorageInstance` | `'local'`       | Where the value lives. Follows the instance unless given.                |
| `parser`         | `Parser \| { name }`                      | `parseAsString` | Turns the stored string into a value and decides the type of the ref.    |
| `clearOnDefault` | `boolean`                                 | `true`          | Remove the entry instead of writing a value equal to the parser default. |
| `mode`           | `'optimistic' \| 'source'`                | `'optimistic'`  | Whether a write the browser refused still reads back.                    |

The defaults for `storage` and `mode`, and the prefix in front of `key`, come from
[createWagen](/api/wagen#storage).

#### mode

With `'optimistic'` the ref reads back the value you assigned even when the browser refused
to store it, and `onError` is what reports the refusal. The value stays until the entry
changes to something other than what the state last read: a storage write has no moment
where it is over, so there is nothing to hand the ref back at, and clearing it on the next
read would empty a field that is still being typed in. With `'source'` every read goes to
the storage. Either way, a write from anywhere else replaces what the state was holding.

## useLocalStorage

```ts
function useLocalStorage<P extends ParserInput | undefined = undefined>(
  options: UseLocalStorageOptions<P>,
): Ref<InferInputValue<P>, InferInputWritable<P>>
```

`useStorage` with `storage` fixed to `'local'`, which is shared by every tab of a site.

```ts
const theme = useLocalStorage({ key: 'theme' })
```

## useSessionStorage

```ts
function useSessionStorage<P extends ParserInput | undefined = undefined>(
  options: UseSessionStorageOptions<P>,
): Ref<InferInputValue<P>, InferInputWritable<P>>
```

`useStorage` with `storage` fixed to `'session'`, which belongs to one tab.

## defineStorageState

```ts
function defineStorageState<P extends ParserInput | undefined = undefined>(
  options: WithParser<StorageStateOptions, P>,
): StorageState<InferInputValue<P>, InferInputWritable<P>>
```

The same state without a ref, for code that runs outside a component. It takes the options
above as plain values.

```ts
import { defineStorageState, useStorage } from 'usewagen/storage'

export const themeState = defineStorageState({ key: 'theme' })

themeState.set('dark')

const theme = useStorage(themeState)
```

### StorageState

| Member      | Type                                    | Description                                                       |
| ----------- | --------------------------------------- | ----------------------------------------------------------------- |
| `key`       | `string`                                | The key without the prefix.                                       |
| `storage`   | `StorageInstance`                       | The instance it reads from.                                       |
| `get`       | `() => T`                               | Reads the value through the parser.                               |
| `set`       | `(value: W) => void`                    | Writes it back. `set(null)` removes the entry.                    |
| `remove`    | `() => void`                            | Removes the entry regardless of the parser and `clearOnDefault`.  |
| `subscribe` | `(listener: () => void) => Unsubscribe` | Runs the listener on every change, and returns the stop function. |
