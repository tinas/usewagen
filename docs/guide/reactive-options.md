# Reactive Options

Nothing in an options object has to be known when the component is written. Every option
takes a plain value, a `ref`, a `computed` or a getter, and the options object itself can be
any of those, which is what makes these composables rather than plain functions.

```ts
useLocalStorage({ key: 'theme' })
useLocalStorage({ key: () => `theme:${user.value.id}` })
useLocalStorage(() => ({ key: `theme:${user.value.id}` }))
```

The type behind this is `MaybeRefOrGetter`, the one `toValue` takes, so whatever you would
hand to a Vue utility works here as well.

## A key that follows the app

A per user setting, a tenant taken from the route, a document being edited: the key is as
much data as the value is.

```ts
const settings = useLocalStorage({ key: () => `settings:${user.value.id}` })
```

When the key changes, the ref reads the entry under the new key and its subscription moves
along with it. The entry under the old key stays where it is, untouched, so what one user
left behind is still there when they come back.

In the URL the name of the param is `urlKey`, and `key` stays the name of the state in your
code.

```ts
const page = useRouteState({
  key: 'page',
  urlKey: () => `${tenant.value}_page`,
  parser: parseAsInteger.withDefault(1),
})
```

## A target that follows the app

Where a value is kept can be decided while the app runs, the same way.

```ts
const draft = useStorage({
  key: 'draft',
  storage: () => (isGuest.value ? 'session' : 'local'),
})
```

The router options work like this too, so `source`, `history`, `clearOnDefault` and `mode`
can all depend on where the user is or what they are doing. `set` and `reset` on a group read
them at the moment you call them, not when the group was created.

## A parser that follows the app

A value whose type depends on something else needs a parser that depends on the same thing.
A filter over a column is the usual case: a number for one column, a string for the next.

```ts
const value = useRouteState({
  key: 'value',
  parser: () => (column.value.numeric ? parseAsInteger : parseAsString),
})
```

The ref is typed as the union of the parsers that can be returned, so this one is a
`Ref<number | string | null>`.

What the source holds is not rewritten when the parser changes. It is read again through the
new one, so `?value=42` gives the number `42` and then the string `'42'`. A value the new
parser will not accept reads as that parser's default, or as `null` when it has none.

## The one that stays

`key` in `useRouteStates` names the ref that comes back, as in `filters.page`. It is part of
the shape of the returned object rather than data, so it is read once. Everything variable
about the param belongs in `urlKey`.

`defineStorageState` takes the same options as plain values, since it builds a state that has
no scope to track anything in.
