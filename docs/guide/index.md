# Introduction

usewagen is a set of Vue composables for state that lives in the URL or in the browser
storage. You describe the value once and get a ref back.

```ts
const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
const theme = useLocalStorage({ key: 'theme' })
```

`page` is a `Ref<number>` over `?page=` and `theme` a `Ref<string | null>` over the `theme`
entry in `localStorage`. Reading one goes to the source it belongs to and writing it goes
back there, with no copy of the value in between, and the parser decides the type.

What the composables take off your hands is the parsing, the defaults and the writing, for
both sources and in the same shape.
