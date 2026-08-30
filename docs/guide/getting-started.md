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

`vue` is a peer dependency. `vue-router` is only needed if you use the router composables.

## Setup

The composables work on their own, with sensible defaults. Installing the plugin is what
lets you set those defaults in one place.

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

## Your first state

```vue
<script setup lang="ts">
import { parseAsInteger } from 'usewagen'
import { useRouteState } from 'usewagen/router'
import { useLocalStorage } from 'usewagen/storage'

const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
const theme = useLocalStorage({ key: 'theme' })
</script>

<template>
  <button @click="page++">Page {{ page }}</button>
  <input v-model="theme" />
</template>
```

`page` is a `Ref<number>` over `?page=`, and it reads `1` while the param is missing.
`theme` is a `Ref<string | null>` over the `theme` entry in `localStorage`, where setting it
to `null` removes the entry and an empty string is stored as one. Both behave like any other
ref in your template.

::: tip
The composables live in two entry points. Router state comes from `usewagen/router`,
storage state from `usewagen/storage`, and parsers from `usewagen`.
:::
