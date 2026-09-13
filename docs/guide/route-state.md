# Route State

Route state puts a value in the URL and gives you a ref over it. The address bar, the back
button, a reload and a shared link all describe the same screen, because the screen is
rendered from the URL.

::: info
The composables on this page call `useRoute` and `useRouter`, so they need `vue-router` 4 or
5 installed on the app.
:::

```vue
<script setup lang="ts">
import { useRouteState } from 'usewagen/router'

const q = useRouteState({ key: 'q' })
</script>

<template>
  <input v-model="q" placeholder="Search" />
</template>
```

Typing `vue` puts `?q=vue` in the address bar. Without a parser the ref is a
`Ref<string | null>`, which is what a query string can hold, and `key` is both the name of
the state and the name of the param.

## Typed values

A parser turns the param into the value you want to work with, and decides the type of the
ref along the way.

```ts
import { parseAsArrayOf, parseAsInteger, parseAsString } from 'usewagen'

const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
const tags = useRouteState({ key: 'tags', parser: parseAsArrayOf(parseAsString) })
```

`page` is a `Ref<number>` rather than `Ref<number | null>`, because `withDefault` says what
a missing param means. `tags` reads `?tags=vue,vite` as `['vue', 'vite']`.

A missing param and a param edited into something the parser cannot read both give the
default, so there is no error to catch. [Parsers](/guide/parsers) covers what is available
and how to write your own.

## Writing

Writing the ref writes the URL.

```ts
page.value = 2 // ?page=2
q.value = '' // ?q=
q.value = null // the param is gone
```

An empty string is a value, so it stays in the URL. `null` is what removes a param, which
also means an input cleared with `v-model` leaves `?q=` behind. Write that `null` from
script code rather than from a template, because Vue's template types keep the type a ref
reads and not the wider one it accepts.

Writing the default takes the param out instead of writing it, since a missing param already
reads as the default, so a shared link carries what the user changed and nothing else.
`clearOnDefault: false` writes it like any other value.

```ts
page.value = 1 // the param is gone, and page.value is still 1
```

Writes made in the same tick are collected and applied as one navigation, so a page number
and a filter that change together update the URL once rather than twice.

```ts
page.value = 2
tags.value = ['vue']
// /?page=2&tags=vue
```

By default a write replaces the current history entry, which is what filters and pagination
want. `history: 'push'` adds one instead, so the back button undoes the change. When writes
that ask for different things end up in the same navigation, the one asking for `'push'`
decides.

## Reading back a write

The ref reads back the value you assigned right away, before the navigation that carries it
has run, so a state behaves like a plain `ref` in the code around it. Once the navigation
lands, the URL is what the ref reads, and a navigation a guard cancels returns the ref to
the value the URL holds.

Where a value that might not land must never be shown, [`mode: 'source'`](/guide/how-it-works#what-you-read-in-the-meantime) reads
the route on every access instead.

## Several params together

`useRouteStates` describes a group of params, returns a ref per key and adds three functions
for working with the group as a whole.

```ts
import { parseAsInteger, parseAsString } from 'usewagen'
import { useRouteStates } from 'usewagen/router'

const filters = useRouteStates([
  { key: 'page', parser: parseAsInteger.withDefault(1) },
  { key: 'q' },
  { key: 'sort', parser: parseAsString },
])

filters.q.value = 'vue'
filters.set({ q: 'vue', page: 1 })
filters.reset()
filters.toObject()
```

Each entry takes the options a single route state takes. `set` writes a patch and leaves the
keys it does not mention alone, `reset` puts every key back to its default, and `toObject`
gives the current values as a plain object, typed key by key. Both `set` and `reset` take a
history mode for that one call.

```ts
filters.set({ page: 2 }, { history: 'push' })
```

The `key` here names the ref you get back, as in `filters.page`, so it is read once. A param
name that changes while the app runs goes in `urlKey`, which is the name in the URL and is
reactive like every other option.

## Definitions outside the component

`routeStateOptions` returns the options you hand it with their types intact, so a definition
can live where the feature lives and be used from more than one component.

```ts [filters.ts]
import { parseAsInteger, parseAsString } from 'usewagen'
import { routeStateOptions } from 'usewagen/router'

export const pageOptions = routeStateOptions({
  key: 'page',
  parser: parseAsInteger.withDefault(1),
})

export const queryOptions = routeStateOptions({ key: 'q', parser: parseAsString })
```

```ts
const page = useRouteState(pageOptions)
const filters = useRouteStates([pageOptions, queryOptions])
```

The parser travels with the definition, so `page` is a `Ref<number>` in both places, and an
option that does not exist is a type error rather than a key that is quietly ignored.
`routeHashOptions` does the same for the hash.

## Route params and the hash

The query string is not the only part of a URL that holds state. `source: 'params'` reads
and writes the dynamic segments of the matched route instead.

```ts
const id = useRouteState({ key: 'id', source: 'params' })
```

`useRouteHash` covers the fragment, keeping the leading `#` as part of the value.

```ts
import { useRouteHash } from 'usewagen/router'

const hash = useRouteHash()

hash.value = '#section'
hash.value = null // the fragment is gone
```

A hash written beside a param joins the same navigation as that param.
