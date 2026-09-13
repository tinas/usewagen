# Storage State

Storage state puts a value in `localStorage` or `sessionStorage` and gives you a ref over it.
A preference set on one visit is still there on the next one, with nothing to hydrate and no
watcher to write it back.

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

`theme` is a `Ref<string | null>` over the `theme` entry, and it reads `null` while the entry
is missing. `useSessionStorage` is the same thing in the storage that belongs to one tab and
is gone when that tab closes.

`useStorage` is the form that takes the storage as an option, for a state that has to choose.

```ts
import { useStorage } from 'usewagen/storage'

const seen = useStorage({ key: 'seen', storage: 'session' })
```

## Typed values

A storage holds strings and nothing else, so anything that is not a string needs a parser to
get in and out of one.

```ts
import { parseAsBoolean, parseAsJson } from 'usewagen'

const collapsed = useLocalStorage({ key: 'collapsed', parser: parseAsBoolean.withDefault(false) })
const draft = useSessionStorage({ key: 'draft', parser: parseAsJson<Draft>() })
```

`collapsed` is a `Ref<boolean>` and `draft` a `Ref<Draft | null>`. An entry the parser
cannot read, which an entry written by an older version of your app may well be, gives the
default instead of a broken value.

## Writing

The entry is written the moment you assign, and every ref over that key follows.

```ts
theme.value = 'dark' // theme=dark
theme.value = '' // the entry holds an empty string
theme.value = null // the entry is removed
```

An empty string is a value like any other. `null` is what removes an entry, and so is
writing a value equal to the parser default, since a missing entry reads as that default
anyway. `clearOnDefault: false` keeps such a value in the storage instead.

A `null` write belongs in script code rather than in a template, because Vue's template
types keep the type a ref reads and not the wider one it accepts.

A prefix from the [configuration](/guide/configuration) goes in front of every key, so two
apps on one origin can both keep a `theme` without meeting.

## When a write does not land

A browser refuses a write when its quota is full, and refuses everything when the user has
turned storage off for the site. The ref keeps reading back the value you assigned, so the
screen stays consistent with what the user did, and `onError` is what tells you the write
did not land.

```ts
createWagen({ storage: { onError: error => report(error) } })
```

Where the ref has to follow the storage rather than the assignment,
[`mode: 'source'`](/guide/how-it-works#what-you-read-in-the-meantime) reads the entry on every access.

## Other tabs

Local storage is shared by every tab of a site, and the browser reports a write in one tab to
the others. A ref built on local storage picks that up, so a theme changed in one tab changes
in the rest. Session storage belongs to a single tab, so there is nothing to share. The
listener is turned off with `crossTab: false` in the configuration.

## On the server

There is no storage on the server, so a state reads its default there and the stored value
once the app runs in the browser. Markup that depends on a stored value therefore differs
between the two, which the framework reports as a hydration mismatch. Render such parts
after mount.

## Outside a component

`defineStorageState` is the same state without the ref and without a component to live in,
which is what module level code, a plain function or a store needs.

```ts
import { defineStorageState } from 'usewagen/storage'

export const themeState = defineStorageState({ key: 'theme' })

themeState.set('dark')
themeState.get() // 'dark'
themeState.remove() // the entry is gone
```

It takes the same options as `useStorage` with plain values, and adds `subscribe` for code
that has to react to a change on its own. Handing the state to `useStorage` gives a ref over
it, so a component works with the same state the rest of the app does.

```ts
const theme = useStorage(themeState)
```
