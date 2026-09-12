# Route State

Route state keeps a value in the URL, so the address bar, the back button and a pasted link
all agree with what your components render. A param that is missing reads as the parser
default, if the parser has one, which is what `clearOnDefault` builds on.

```vue
<script setup lang="ts">
import { parseAsString } from 'usewagen'
import { useRouteState } from 'usewagen/router'

const q = useRouteState({ key: 'q', parser: parseAsString })
</script>

<template>
  <input v-model="q" />
</template>
```

Typing in the input writes to `?q=`. Clearing it leaves `?q=` behind, since an empty string
is a value of its own, and setting the ref to `null` is what removes the param. Without a
parser the value is a `Ref<string | null>`, which is what the URL gives you.

A write reads back right away, the way a `ref` does, while the navigation itself is applied
on the next tick. Every write made in the same tick is collected and applied in a single
navigation: separate route states, the hash, and the `useRouteStates` batch API alike.

```ts
page.value = 2
tab.value = 'open'
// one navigation, /?page=2&tab=open
```

If a navigation guard cancels that navigation, the refs go back to what the URL actually
holds rather than keeping a value that was never applied. `mode` is what decides this.

## Options

### key

- **Type** `string`
- **Required**

Names the state. It is also the param that is read and written, unless `urlKey` says
otherwise.

### parser

- **Type** `Parser<T>`
- **Default** `parseAsString`

Turns the string in the URL into a value and back. It also decides the type of the ref, so
`parseAsInteger` gives you a `Ref<number | null>` and `parseAsInteger.withDefault(1)` a
`Ref<number>`.

### urlKey

- **Type** `string`
- **Default** the value of `key`

The param name to use in the URL. Set it when the name in your code and the name in the URL
should differ, or when the URL name is decided at runtime.

### source

- **Type** `'query' | 'params'`
- **Default** `'query'`

Where the value is read from. `'query'` uses the search string, `'params'` uses the dynamic
segments of the matched route.

### history

- **Type** `'push' | 'replace'`
- **Default** `'replace'`

How a write navigates. `'replace'` leaves the history alone, which suits filters and
pagination. `'push'` adds an entry, so the back button undoes the change.

### clearOnDefault

- **Type** `boolean`
- **Default** `true`

When the parser has a default and the value is equal to it, the param is removed instead of
written out, since a missing param reads as that default anyway. It keeps defaults out of
shared links. Turn it off and the value is written like any other.

### mode

- **Type** `'optimistic' | 'source'`
- **Default** `'optimistic'`

Whether the state keeps a copy of what you wrote.

With `'optimistic'` a write is visible on the next read, before the navigation that carries
it to the URL has run. The copy is held until the navigation settles: once it lands the URL
and the copy agree, and if a guard cancels it the URL wins and the ref goes back.

With `'source'` every read goes to the current route, so a write is only visible after the
navigation. This is the plain pass-through, and it is what you want when nothing may ever
show a value the URL does not have.

Either way an external navigation wins over the copy, whether it is the back button or a
`router.push` from somewhere else, so a ref can never be left behind.

## Sharing a definition

`routeStateOptions` returns the options you give it, typed. It is there so a definition can
live next to the code that owns it and be used from more than one component, with the parser
and the key carried through.

```ts [filters.ts]
import { parseAsInteger, parseAsString } from 'usewagen'
import { routeStateOptions } from 'usewagen/router'

export const pageOptions = routeStateOptions({
  key: 'page',
  parser: parseAsInteger.withDefault(1),
})

export const tabOptions = routeStateOptions({ key: 'tab', parser: parseAsString })
```

```ts
const page = useRouteState(pageOptions)
const filters = useRouteStates([pageOptions, tabOptions])
```

`page` is a `Ref<number>` and `filters.tab` a `Ref<string | null>`, the same as if the
options had been written inline.

Wrap the options in a getter when they read state that changes, and pass the getter itself
rather than calling it.

```ts
const pageOptions = routeStateOptions(() => ({
  key: `${section.value}-page`,
  parser: parseAsInteger.withDefault(1),
}))
```

A function around it gives you a definition per argument, which is how the same state is
reused for several sections.

```ts
function sectionOptions(section: string) {
  return routeStateOptions({ key: `${section}-page`, parser: parseAsInteger.withDefault(1) })
}

const left = useRouteState(sectionOptions('left'))
const right = useRouteState(sectionOptions('right'))
```

`routeHashOptions` does the same for `useRouteHash`.

## Several params together

`useRouteStates` takes a list of definitions and returns a ref per key, plus a small API for
working with them as a group.

```ts
import { parseAsArrayOf, parseAsInteger, parseAsString } from 'usewagen'
import { useRouteStates } from 'usewagen/router'

const filters = useRouteStates([
  { key: 'page', parser: parseAsInteger.withDefault(1) },
  { key: 'q' },
  { key: 'tags', parser: parseAsArrayOf(parseAsString) },
])

filters.page.value++
filters.set({ page: 1, q: 'vue' })
filters.reset()
filters.toObject()
```

Each definition takes the same options as `useRouteState`. `filters.page` is a `Ref<number>`
and `filters.q` a `Ref<string | null>`, and every ref can be read and written on its own.

### set

Writes a patch, leaving out the keys you do not mention. The whole patch lands in one
navigation.

### reset

Puts every key back to its default, which usually means the params leave the URL.

### toObject

Returns the current values as a plain object, typed key by key.

`set` and `reset` also take a history override for that one call, which wins over the
`history` of each state.

```ts
filters.set({ page: 2 }, { history: 'push' })
```

## The hash

```ts
import { useRouteHash } from 'usewagen/router'

const hash = useRouteHash()

hash.value = '#section'
```

`useRouteHash` returns a `Ref<string | null>` and keeps the leading `#` in the value. It
takes `parser`, `history`, `clearOnDefault` and `mode`, with the same defaults as above, and
its writes join the same navigation as the params written beside them.

::: warning
The router composables call `useRoute` and `useRouter`, so a router has to be installed on
the app.
:::
