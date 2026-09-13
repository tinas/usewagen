# Introduction

usewagen keeps a value where it belongs, in the URL or in the browser storage, and hands you
a ref over it.

A page number in the address bar is read, parsed, watched and written back by hand, and the
copy in memory has to be kept in step with the route on both sides.

```ts
const route = useRoute()
const router = useRouter()

const page = ref(Number(route.query.page ?? 1))

watch(page, value => router.replace({ query: { ...route.query, page: String(value) } }))
watch(
  () => route.query.page,
  value => (page.value = Number(value ?? 1)),
)
```

The same state, with the reading, the parsing and the writing behind it:

```ts
const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
```

`page` is a `Ref<number>`. Reading it parses `?page=`, writing it puts the number back in the
URL, and a missing param reads as `1`. It is a ref, so `page++` and `v-model` do what they
always do.

The browser storage takes the same shape.

```ts
const theme = useLocalStorage({ key: 'theme' })
```

`theme` is a `Ref<string | null>` over the `theme` entry in `localStorage`, where setting it
to `null` removes the entry and a write in another tab reaches this one.

## What you get

The parser decides the type, so a state is a `number`, a `date`, a `literal union` or a shape of
your own rather than a `string` you have to check.

Params written in the same tick become one navigation, so a page number and a filter that
change together reach the URL in one step.

Options are reactive, so a key, a storage or a parser that is only known while the app runs
is an option like any other.

## What it covers

State in the URL, from the query string to the dynamic segments and the hash
([Route State](/guide/route-state)), state in local and session storage
([Storage State](/guide/storage-state)), the [parsers](/guide/parsers) that give both their
types, the [configuration](/guide/configuration) that puts the defaults of an app in one
place, and a [Vite plugin](/guide/vite-plugin) that collects the parsers of a project so they
can be used by name.

[How It Works](/guide/how-it-works) is the one page that explains the rest of the library
from three pieces.
