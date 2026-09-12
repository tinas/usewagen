# Introduction

usewagen is a set of Vue composables for state that lives in the URL or in the browser
storage. You describe the value once and get a ref back.

```ts
const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
const theme = useLocalStorage({ key: 'theme' })
```

`page` is a `Ref<number>` over `?page=` and `theme` a `Ref<string | null>` over the `theme`
entry in `localStorage`. The parser decides the type. Writing one reads back at once, the way
a `ref` does, while the source it belongs to keeps the last word: a value written in another
tab, or a step back through the history, wins over what you wrote.

What the composables take off your hands is the parsing, the defaults and the writing, for
both sources and in the same shape.
