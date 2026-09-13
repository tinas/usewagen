# Router

Exported from `usewagen/router`. All three composables call `useRoute` and `useRouter`, so
`vue-router` 4 or 5 has to be installed on the app.

## useRouteState

```ts
function useRouteState<P extends ParserInput | undefined = undefined>(
  options: UseRouteStateOptions<P>,
): Ref<InferInputValue<P>, InferInputWritable<P>>
```

Keeps one value in the URL and returns a ref over it.

```ts
import { parseAsInteger } from 'usewagen'
import { useRouteState } from 'usewagen/router'

const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
```

The options object, and every option in it, accepts a value, a `ref`, a `computed` or a
getter. See [Reactive Options](/guide/reactive-options).

### Options

| Option           | Type                       | Default            | Description                                                              |
| ---------------- | -------------------------- | ------------------ | ------------------------------------------------------------------------ |
| `key`            | `string`                   | required           | Names the state, and the param unless `urlKey` is given.                 |
| `parser`         | `Parser \| { name }`       | `parseAsString`    | Turns the param into a value and decides the type of the ref.            |
| `urlKey`         | `string`                   | the value of `key` | The param name in the URL.                                               |
| `source`         | `'query' \| 'params'`      | `'query'`          | The query string, or the dynamic segments of the matched route.          |
| `history`        | `'push' \| 'replace'`      | `'replace'`        | How a write navigates.                                                   |
| `clearOnDefault` | `boolean`                  | `true`             | Remove the param instead of writing a value equal to the parser default. |
| `mode`           | `'optimistic' \| 'source'` | `'optimistic'`     | Whether a write reads back before the navigation lands.                  |

The defaults for `source`, `history`, `clearOnDefault` and `mode` come from
[createWagen](/api/wagen#router).

#### history

Writes made in the same tick become one navigation, and that navigation is pushed when any
write in it asks for `'push'`.

#### mode

With `'optimistic'` a write reads back at once and the URL takes over when the navigation
lands, so a navigation a guard cancels returns the ref to the value the URL holds. The
window is short, only the tick the write is batched into, and a URL is meant to be copied
and reopened, so the URL is what the ref settles on rather than the write that tried to
change it. With `'source'` every read goes to the current route.

## useRouteStates

```ts
function useRouteStates<const T extends readonly RouteStateConfig[]>(
  configs: T,
): UseRouteStatesReturn<T>
```

Describes a group of params and returns a ref per key, plus `set`, `reset` and `toObject`.

```ts
import { parseAsInteger } from 'usewagen'
import { useRouteStates } from 'usewagen/router'

const filters = useRouteStates([
  { key: 'page', parser: parseAsInteger.withDefault(1) },
  { key: 'q' },
])
```

Each entry takes the options above. `key` names the ref that comes back, so it is read once
and is the only option that is not reactive.

| Member     | Type                                      | Description                                             |
| ---------- | ----------------------------------------- | ------------------------------------------------------- |
| `set`      | `(patch, options?: { history? }) => void` | Writes the keys in the patch, in one navigation.        |
| `reset`    | `(options?: { history? }) => void`        | Writes every key back to its parser default.            |
| `toObject` | `() => Values`                            | The current values as a plain object, typed key by key. |

```ts
filters.set({ q: 'vue', page: 1 })
filters.set({ page: 2 }, { history: 'push' })
filters.reset()
```

## useRouteHash

```ts
function useRouteHash<P extends ParserInput | undefined = undefined>(
  options?: UseRouteHashOptions<P>,
): Ref<InferInputValue<P>, InferInputWritable<P>>
```

Keeps the fragment of the URL, with the leading `#` as part of the value. Takes `parser`,
`history`, `clearOnDefault` and `mode`, with the same defaults.

```ts
import { useRouteHash } from 'usewagen/router'

const hash = useRouteHash()

hash.value = '#section'
hash.value = null
```

## routeStateOptions

```ts
function routeStateOptions<const T extends RouteStateConfig>(options: T): T
function routeStateOptions<const T extends RouteStateConfig>(options: () => T): () => T
```

Returns the options it is given with their types intact, so a definition can be written once
and used from several components. An option a route state does not have is a type error.

```ts [filters.ts]
import { parseAsInteger } from 'usewagen'
import { routeStateOptions } from 'usewagen/router'

export const pageOptions = routeStateOptions({
  key: 'page',
  parser: parseAsInteger.withDefault(1),
})
```

```ts
const page = useRouteState(pageOptions)
```

Options that read changing state go in a getter, which is passed on as it is.

## routeHashOptions

```ts
function routeHashOptions<const T extends RouteHashConfig>(options: T): T
function routeHashOptions<const T extends RouteHashConfig>(options: () => T): () => T
```

The same for `useRouteHash`.
