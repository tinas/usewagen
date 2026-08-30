# usewagen

Reactive state for URL and storage in Vue. Type-safe, with the value in exactly one place.

Documentation lives at [usewagen.dev](https://usewagen.dev).

## Install

```sh
pnpm add usewagen
```

`vue` is a peer dependency. `vue-router` is only needed if you use the router composables.

## Usage

```ts
import { parseAsInteger } from 'usewagen'
import { useRouteState } from 'usewagen/router'
import { useLocalStorage } from 'usewagen/storage'

const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
const theme = useLocalStorage({ key: 'theme' })
```

`page` is a `Ref<number>` over `?page=` and `theme` a `Ref<string | null>` over the `theme`
entry in `localStorage`.

## License

[MIT](./LICENSE)
