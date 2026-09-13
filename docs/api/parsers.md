# Parsers

Exported from `usewagen`. A parser turns the string a source holds into a value and back,
and determines the type of the ref a composable returns.

## Built-in parsers

| Parser                 | Ref type             | In the source         |
| ---------------------- | -------------------- | --------------------- |
| `parseAsString`        | `string`             | `q=vue`               |
| `parseAsInteger`       | `number`             | `page=2`              |
| `parseAsFloat`         | `number`             | `ratio=1.5`           |
| `parseAsIndex`         | `number`             | `page=1` reads as `0` |
| `parseAsBoolean`       | `boolean`            | `open=true`           |
| `parseAsDate`          | `Date`               | `day=2026-08-30`      |
| `parseAsStringLiteral` | one of given strings | `sort=asc`            |
| `parseAsStringEnum`    | one of given strings | `sort=asc`            |
| `parseAsNumberLiteral` | one of given numbers | `size=25`             |
| `parseAsArrayOf`       | `T[]`                | `tags=vue,vite`       |
| `parseAsJson`          | `T`                  | `filter={"a":1}`      |

The first six are parsers. The last five are functions that return one. Each type in the
table is the value type; without `withDefault` the ref is that type or `null`.

A string a parser does not accept is treated as a missing value, so it reads as the default
or as `null`. Nothing throws.

### parseAsDate

```ts
parseAsDate // 2026-08-30
parseAsDate.iso() // 2026-08-30T12:00:00.000Z
parseAsDate.timestamp() // 1788091200000
```

`parseAsDate` reads a date-only string as UTC midnight and writes the date part back.
`iso()` keeps the full ISO string, `timestamp()` stores milliseconds. Both are functions, so
each call returns its own parser.

### parseAsStringLiteral

```ts
function parseAsStringLiteral<const T extends readonly string[]>(values: T): Parser<T[number]>
```

Narrows to the values listed and rejects the rest.

```ts
parseAsStringLiteral(['asc', 'desc']) // Parser<'asc' | 'desc'>
```

### parseAsStringEnum

```ts
function parseAsStringEnum<T extends string>(values: T[]): Parser<T>
```

The same behavior for a plain array of strings, which is what an enum gives you.

### parseAsNumberLiteral

```ts
function parseAsNumberLiteral<const T extends readonly number[]>(values: T): Parser<T[number]>
```

Narrows to the numbers listed.

### parseAsArrayOf

```ts
function parseAsArrayOf<T>(itemParser: Parser<T>, separator?: string): Parser<T[]>
```

Splits on `separator`, which defaults to `,`, and runs each item through `itemParser`. An
item the inner parser rejects is dropped from the result. A separator inside a value is
percent encoded when written and decoded when read. An empty string reads as an empty array.

### parseAsJson

```ts
function parseAsJson<T>(): Parser<T>
```

`JSON.parse` and `JSON.stringify`, typed by the caller. Invalid JSON reads as a missing
value.

## Parser

| Member         | Type                                              |
| -------------- | ------------------------------------------------- |
| `parse`        | `(raw: string) => T \| null`                      |
| `serialize`    | `(value: T) => string`                            |
| `withDefault`  | `(value: T \| (() => T)) => ParserWithDefault<T>` |
| `defaultValue` | `T \| (() => T)`, on a parser with a default      |

## withDefault

```ts
parser.withDefault(value: T | (() => T)): ParserWithDefault<T>
```

Returns a new parser carrying a default, which makes the ref non-nullable. The default
applies to a missing value and to a string that cannot be parsed. Given a function, it is
called on every read.

```ts
parseAsInteger.withDefault(1) // Ref<number>
parseAsInteger.withDefault(() => settings.value.pageSize)
```

With `clearOnDefault` on, writing a value that serializes to the same string as the default
removes it from the source instead of writing it.

## defineParser

```ts
function defineParser<T>(options: {
  parse: (raw: string) => T | null
  serialize?: (value: T) => string
}): Parser<T>
```

Creates a parser. `parse` returns `null` for a string it does not accept. `serialize`
defaults to `String`.

```ts
import { defineParser } from 'usewagen'

export const parseAsSlug = defineParser<string>({
  parse: raw => (/^[a-z0-9-]+$/.test(raw) ? raw : null),
})
```

## tryParse

```ts
function tryParse<I, R>(fn: (input: I) => R, input: I): R | null
```

Calls `fn` and returns `null` if it throws, with a warning. `parseAsArrayOf` uses it per
item, and a parser wrapping a function that throws instead of returning `null` can use it
the same way.

## unwrapDefault

```ts
function unwrapDefault<T>(value: T | (() => T)): T
```

Calls the value if it is a function, and returns it otherwise.

## Named parsers

Anywhere a parser is accepted, an object naming a registered parser is accepted too.

```ts
{ name: 'parseAsSlug' }
{ name: 'parseAsSlug', defaultValue: 'untitled' }
```

`defaultValue` acts as `withDefault` does, and makes the ref non-nullable. Names are
registered with [createWagen](/api/wagen#parsers), and the built-in names are always
available. An unregistered name warns once and falls back to `parseAsString`.

TypeScript knows the built-in names, and knows yours once the [Vite plugin](/api/vite) has
declared them.
