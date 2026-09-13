# Parsers

A URL and a storage hold strings. A parser is the pair of functions that turns such a string
into the value you want and back again, and it is what decides the type of every state you
create.

```ts
const page = useRouteState({ key: 'page', parser: parseAsInteger })
```

`page` is a `Ref<number | null>`. The parser reads `?page=2` as `2`, writes `2` back as
`'2'`, and reads `?page=later` as `null`, because a string it cannot use is treated the same
way as a param that was never there.

## Choosing one

Without a parser a state is a `Ref<string | null>`, which is what `parseAsString` gives
you.

Numbers come in three forms. `parseAsInteger` writes whole numbers, `parseAsFloat` keeps the
decimals, and `parseAsIndex` shifts by one, for a list that is numbered from `1` in the URL
and from `0` in your code.

`parseAsBoolean` reads and writes `true` and `false`.

Dates come in three forms as well, chosen by how the value should look in the URL.

```ts
parseAsDate // day=2026-08-30
parseAsDate.iso() // day=2026-08-30T12:00:00.000Z
parseAsDate.timestamp() // day=1788091200000
```

A value that may only be one of a few things is narrowed by listing them, which keeps a
hand edited URL from putting an unknown sort order into your component.

```ts
const sort = useRouteState({
  key: 'sort',
  parser: parseAsStringLiteral(['asc', 'desc']).withDefault('asc'),
})
```

`sort` is a `Ref<'asc' | 'desc'>`. `parseAsStringEnum` is the same parser for a plain array
of strings, which is what you have when the values come from an enum.
`parseAsNumberLiteral` does it for numbers.

A list takes the parser of one item, and a separator when the default comma does not suit.

```ts
const tags = useRouteState({ key: 'tags', parser: parseAsArrayOf(parseAsString) })
const sizes = useRouteState({ key: 'sizes', parser: parseAsArrayOf(parseAsInteger, ';') })
```

`?tags=vue,vite` reads as `['vue', 'vite']`. A separator inside a value is encoded on the way
out, and an item the inner parser refuses is dropped rather than spoiling the whole list.

Anything with a shape of its own goes through JSON, typed by you, since JSON carries no type.

```ts
const filter = useRouteState({ key: 'filter', parser: parseAsJson<Filter>() })
```

[Parsers](/api/parsers) lists every one of them with what it writes.

## Defaults

`withDefault` says what a missing value means, which makes the ref non-nullable.

```ts
const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
```

`page` is a `Ref<number>`, and the default covers both the missing param and the one that
cannot be parsed. It also changes what writing does: with `clearOnDefault` on, writing `1`
removes the param instead of putting it in the URL, since the URL without it already means
`1`.

A default can be a function, which is read on every read, for a default that depends on
something else.

```ts
const size = useRouteState({
  key: 'size',
  parser: parseAsInteger.withDefault(() => settings.value.pageSize),
})
```

## Writing your own

`defineParser` takes a `parse` and, when `String` is not the right way back, a `serialize`.
Returning `null` from `parse` is how a parser says the string is not a value it accepts.

```ts
import { defineParser } from 'usewagen'

export const parseAsSlug = defineParser<string>({
  parse: raw => (/^[a-z0-9-]+$/.test(raw) ? raw : null),
})
```

What comes back is a parser like any other, `withDefault` included. A parser that builds on
another can use `tryParse`, which runs a parse function and turns a thrown error into `null`,
and `unwrapDefault`, which reads a default that may have been given as a function.

## Using a parser by name

A parser can be passed by name instead of by value, which keeps the definition out of the
component and the same definition in one place.

```ts
import { createWagen } from 'usewagen'
import { parseAsSlug } from './parsers/slug'

createWagen({ parsers: { parseAsSlug } })
```

```ts
const slug = useRouteState({ key: 'slug', parser: { name: 'parseAsSlug' } })
```

A default travels with the name where the state needs one.

```ts
const sort = useRouteState({ key: 'sort', parser: { name: 'parseAsSort', defaultValue: 'asc' } })
```

TypeScript knows the built-in names. For your own there is the
[Vite plugin](/guide/vite-plugin), which collects a folder of parsers into one module to
register and declares their names, so a new parser file is usable by name without any setup.
A name nothing is registered under warns and falls back to `parseAsString`.
