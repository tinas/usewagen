# Reactive Options

Every option accepts a plain value, a `ref`, a `computed` or a getter, and the options
object itself can be any of those too. This is what makes these composables rather than
plain functions, since a piece of state can point at something that is only known while the
app runs.

```ts
const key = ref('theme')

useLocalStorage({ key: 'theme' })
useLocalStorage({ key })
useLocalStorage({ key: computed(() => `config:${user.value.id}`) })
useLocalStorage({ key: () => `config:${user.value.id}` })
useLocalStorage(reactive({ key: 'theme' }))
useLocalStorage(() => ({ key: `config:${user.value.id}` }))
useLocalStorage(computed(() => ({ key: `config:${user.value.id}` })))
```

The type behind this is `MaybeRefOrGetter`, the same one `toValue` takes, so anything you
would hand to a Vue utility works here as well.

When the key changes, the ref reads the new entry and its subscription moves with it. The
old entry is left as it is, so nothing is copied or migrated.

The storage target is reactive in the same way.

```ts
const draft = useStorage({
  key: 'draft',
  storage: () => (isGuest.value ? 'session' : 'local'),
})
```

On the router side `urlKey`, `source`, `history`, `clearOnDefault` and `mode` are reactive as
well, and `set` and `reset` read them at the moment you call them.

```ts
const page = useRouteState({
  key: 'page',
  urlKey: () => `${tenant.value}_page`,
  parser: parseAsInteger.withDefault(1),
})
```

`parser` is reactive too, which is how a value whose type depends on something else is
handled, such as a column filter that is a number for one column and a string for the next.

```ts
const value = useRouteState({
  key: 'value',
  parser: () => (column.value.numeric ? parseAsInteger : parseAsString),
})
```

The ref is typed as the union of the parsers you can return, so the example above gives a
`Ref<number | string | null>`. The value in the URL is left alone when the parser changes
and is read again through the new one, exactly as it is when the key changes. A value the
new parser cannot read falls back to that parser's default, or to `null` without one.

One option stays static. `key` in `useRouteStates` names the ref it returns, as in
`filters.page`. It is an identifier in your source rather than data, so use `urlKey` for the
part that varies.
