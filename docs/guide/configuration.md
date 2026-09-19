# Configuration

`createWagen` is where an app decides once what every state would otherwise repeat. It is
optional: without it the composables use the same defaults, and the first call creates an
instance on its own.

```ts [main.ts]
import { createApp } from 'vue'
import { createWagen } from 'usewagen'
import App from './App.vue'

const wagen = createWagen({
  storage: { prefix: 'app:', onError: error => report(error) },
  router: { history: 'push' },
})

createApp(App).use(wagen).mount('#app')
```

A `prefix` is the one setting an app with any storage state wants. It keeps the entries of
this app apart from everything else on the origin, and it is what makes `keys` and `clear`
able to tell which entries belong here. `onError` is the only report of a storage write the
browser refused, and `history` is where an app decides whether its URL changes are steps the
back button undoes.

The configuration is also where a storage is replaced outright, which is how a test or a
server run swaps in something that is not the browser's.

```ts
import { createMemoryStorage } from 'usewagen/storage'

createWagen({ storage: { session: createMemoryStorage() } })
```

Parsers used by name are registered here as well. See
[Parsers](/guide/parsers#using-a-parser-by-name).

[Instance](/api/wagen) lists every option with its default.

## The missing value

A state without a default reads `null` where its source holds nothing it can use, and
writing `null` removes the value. An app that would rather work with `undefined`, so that a
value that may be absent can be passed on as it is, replaces that
[missing value](/guide/parsers#the-missing-value) in two places.

The type is declared once, in a declaration file the project already compiles. The file has
to be a module, which is what the `export {}` is for; without it the block declares a module
of its own in place of the package instead of adding to it. The Vite plugin regenerates the
`usewagen.d.ts` it writes, so the block goes in a file of your own.

```ts [env.d.ts]
export {}

declare module 'usewagen' {
  interface Register {
    missing: undefined
  }
}
```

The value goes to the instance.

```ts [main.ts]
const wagen = createWagen({ missing: undefined })
```

From then on every ref without a default is a `Ref<T | undefined>`, reads `undefined` where it
read `null`, and is cleared by writing `undefined` or, as before, `null`. A state that wants
something else says so with `missing` in its own options, which wins over the instance.

The two halves belong together, and `createWagen` holds them together as far as TypeScript
allows. Once `Register` names a type the option is required, so an instance created without
the value is a type error, and a value of another type is one as well. What is not caught is
`undefined` given while `Register` is still empty, which passes through an optional option
unless `exactOptionalPropertyTypes` is on, and the instance the composables create on their
own when none is installed, which reads `null`. Since the instance is where the value lives,
an app that changes the type installs one.

## Reading the instance

`useWagen` hands a component the active instance, which carries the registered parsers, the
resolved router defaults and the storage instances the composables write through.

```ts
import { useWagen } from 'usewagen'

const { storage } = useWagen()

storage.local.keys()
storage.default.clear({ except: ['theme'] })
```

Outside a component, `getActiveWagen` returns the installed instance, or creates one with the
defaults when there is none.

`wagen.destroy()` releases the storage instances the instance created and clears it as the
active one, which is what a test does between two cases.

## Keeping the config elsewhere

`defineWagenConfig` returns the object it is given, and exists so that a configuration can
live in its own file without losing its types.

```ts [wagen.config.ts]
import { defineWagenConfig } from 'usewagen'

export default defineWagenConfig({
  storage: { prefix: 'app:' },
})
```
