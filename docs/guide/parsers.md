# Parsers

A parser is the pair of functions that turns a string into a value and back. It decides
what the composable returns, so `parseAsInteger` gives you a `Ref<number | null>` and
`parseAsBoolean` a `Ref<boolean | null>`.

## Built-in parsers

| Parser                 | Value                    | In the URL            |
| ---------------------- | ------------------------ | --------------------- |
| `parseAsString`        | `string`                 | `q=vue`               |
| `parseAsInteger`       | `number`                 | `page=2`              |
| `parseAsFloat`         | `number`                 | `ratio=1.5`           |
| `parseAsIndex`         | `number`                 | `page=1` reads as `0` |
| `parseAsBoolean`       | `boolean`                | `open=true`           |
| `parseAsDate`          | `Date`                   | `day=2026-08-30`      |
| `parseAsStringLiteral` | one of the given strings | `sort=asc`            |
| `parseAsStringEnum`    | one of the given strings | `sort=asc`            |
| `parseAsNumberLiteral` | one of the given numbers | `size=25`             |
| `parseAsArrayOf`       | an array                 | `tags=vue,vite`       |
| `parseAsJson`          | anything                 | `filter={"a":1}`      |

`parseAsDate` reads a date-only string and writes one back. Use `parseAsDate.iso()` to keep
the full ISO string, or `parseAsDate.timestamp()` to store milliseconds.

`parseAsStringLiteral` takes the values as a readonly tuple and narrows to them.
`parseAsStringEnum` is the same parser for a plain array of strings, which is what you have
when the values come from an enum.

`parseAsArrayOf` takes the parser for one item and, if you need it, a separator.

```ts
const tags = useRouteState({ key: 'tags', parser: parseAsArrayOf(parseAsString, ';') })
```

`parseAsJson` is typed by you, since JSON carries no type of its own.

```ts
const filter = useRouteState({ key: 'filter', parser: parseAsJson<Filter>() })
```

## Defaults

`withDefault` makes the value non-nullable. The default is used when the param is missing
and when the string cannot be parsed.

```ts
const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
```

`page` is now a `Ref<number>`. With `clearOnDefault` left on, writing `1` removes the param
instead of putting `?page=1` in the URL, which keeps the default out of shared links.

A default can also be a function, which is read again on every read.

```ts
const size = useRouteState({
  key: 'size',
  parser: parseAsInteger.withDefault(() => settings.value.pageSize),
})
```

## Writing a parser

`defineParser` takes a `parse` and an optional `serialize`. Returning `null` from `parse`
means the string is not a valid value, and the default is used instead.

```ts
import { defineParser } from 'usewagen'

export const parseAsSlug = defineParser<string>({
  parse: raw => (/^[a-z0-9-]+$/.test(raw) ? raw : null),
  serialize: value => value,
})
```

`serialize` may be left out, in which case the value goes through `String`. The result is a
parser like any other, `withDefault` included.

Two helpers come along for parsers that build on others. `tryParse` runs a parse function
and turns a thrown error into `null`, and `unwrapDefault` reads a default that may have been
given as a factory.

## Parsers by name

A parser can also be referenced by name, which keeps the definition out of the component.
Register your parsers when you create the instance.

```ts
import { createWagen } from 'usewagen'
import { parseAsSlug } from './parsers/slug'

const wagen = createWagen({ parsers: { parseAsSlug } })
```

```ts
const slug = useRouteState({ key: 'slug', parser: { name: 'parseAsSlug' } })
```

A default can travel with the name.

```ts
const sort = useRouteState({ key: 'sort', parser: { name: 'parseAsSort', defaultValue: 'asc' } })
```

The Vite plugin can collect them for you, so a growing folder of parsers stays out of your
setup code.
