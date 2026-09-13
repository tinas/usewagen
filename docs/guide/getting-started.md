# Getting Started

## Installation

::: code-group

```sh [pnpm]
pnpm add usewagen
```

```sh [npm]
npm install usewagen
```

```sh [yarn]
yarn add usewagen
```

:::

## Setup

The composables run without any setup. Installing the plugin is what gives the whole app one
set of defaults, so a key prefix or a history mode is decided once instead of at every call.

```ts [main.ts]
import { createApp } from 'vue'
import { createWagen } from 'usewagen'
import App from './App.vue'
import { router } from './router'

const wagen = createWagen({
  storage: { prefix: 'app:' },
  router: { history: 'replace' },
})

createApp(App).use(router).use(wagen).mount('#app')
```

[Instance](/api/wagen) lists everything the configuration takes.

## A value in the URL

```vue
<script setup lang="ts">
import { parseAsInteger } from 'usewagen'
import { useRouteState } from 'usewagen/router'

const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
</script>

<template>
  <button :disabled="page === 1" @click="page--">Previous</button>
  <span>Page {{ page }}</span>
  <button @click="page++">Next</button>
</template>
```

`page` is a `Ref<number>`. The parser reads `?page=` as a number, and `withDefault(1)` means
there is no missing case to handle: a URL without the param reads as `1`.

Clicking Next writes `?page=2` and `page.value` is `2` on the next line, before the
navigation carrying it has run. Clicking Previous back to `1` takes the param out of the URL
again, since a missing param reads as `1` anyway, which keeps the default out of the links
people share.

## Several values at once

Filters rarely come one at a time. `useRouteStates` describes a group and gives back a ref
per key, plus a `set` that writes a patch.

```ts
import { parseAsInteger } from 'usewagen'
import { useRouteStates } from 'usewagen/router'

const filters = useRouteStates([
  { key: 'page', parser: parseAsInteger.withDefault(1) },
  { key: 'q' },
])

filters.set({ q: 'vue', page: 1 })
```

`filters.page` is a `Ref<number>` and `filters.q` a `Ref<string | null>`, each usable on its
own. Writes made in the same tick reach the URL in one navigation, whether they go through
`set` or through the refs one by one.

## A value in the browser storage

```vue
<script setup lang="ts">
import { useLocalStorage } from 'usewagen/storage'

const theme = useLocalStorage({ key: 'theme' })
</script>

<template>
  <select v-model="theme">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
</template>
```

`theme` is a `Ref<string | null>` over the `theme` entry in `localStorage`. It reads `null`
while the entry is missing, and assigning `null` removes it.

The entry is written the moment you assign, and every other ref over that key follows,
including the ones in another tab of the same site. A value of another shape, an object or a
date, takes [the parser](/guide/parsers) for it: storage holds strings, and the parser is
what makes a string a value again.
