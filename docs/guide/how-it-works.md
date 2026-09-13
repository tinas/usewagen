# How It Works

Every state in usewagen is three things: a source that holds a string, a parser that turns
that string into a value, and a ref that reads and writes through both. The URL and the
browser storage are different places, but a state over either one is built the same way and
behaves the same way.

```ts
const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
const theme = useLocalStorage({ key: 'theme' })
```

## The source holds the value

A read parses what the source holds at that moment. There is no store beside it and no copy
to keep in step, which is why a pasted link and a reloaded page need no further code.

The one value a state does hold is the one you have just written, until that write settles.
That is what [mode](#what-you-read-in-the-meantime) decides, and it is the only piece of
this page that is not about the source.

## The parser decides the type

A source holds strings. `?page=2` is the string `'2'`, and a storage gives back nothing else
either. The parser closes that gap in both directions.

```
'2'  ── parse ──▶  2

 2   ── serialize ──▶  '2'
```

It also decides the type of the ref. `parseAsInteger` gives a `Ref<number | null>`, and
`parseAsInteger.withDefault(1)` a `Ref<number>`, because a default means the value can no
longer be missing.

A value that is not there, and a string the parser refuses, are treated the same way: you
get the default, or `null` when the parser has none. A hand edited URL never reaches your
component as an error.

## The ref is what your component sees

Reading the ref parses the source, and writing it serializes the value back.

```ts
page.value // 1, read from a URL that carries no param
page.value++ // ?page=2
```

Reading inside a template or a computed subscribes to the state the way any other ref does,
and two refs over one key read the same source, so a value written through one of them shows
up in the other as soon as the write lands.

## Writing

A write runs the value through `serialize` and hands the string to the source. Writing
`null` removes the value rather than storing the word `null`, and an empty string is a value
of its own, so `?q=` stays in the URL and `''` stays in the storage.

Where the two sources differ is when the write lands, and what can keep it from landing.

|             | URL                                                                               | Browser storage                                  |
| ----------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| Applied     | on the next tick, together with every other write of that tick, as one navigation | at once                                          |
| Held up by  | a navigation guard that cancels                                                   | a full quota, or storage turned off for the site |
| Reported by | the ref, which returns to the value the URL holds                                 | `onError`, since the ref keeps what you assigned |

Batching is what makes a page number and a filter that change together produce one URL
rather than two, and it covers the hash and `useRouteStates.set` as well.

## What you read in the meantime

Until a write lands, a ref can report one of two things, and `mode` is what chooses.

|                             | `'optimistic'` (default) | `'source'`            |
| --------------------------- | ------------------------ | --------------------- |
| A read right after a write  | the value you wrote      | what the source holds |
| A read once the write lands | the source               | the source            |

`'optimistic'` is the default because most state is edited by the person looking at it. A
search field that writes on every keystroke has to show the letter that was just typed, not
the one the source held a tick ago.

`'source'` keeps no copy at all, so nothing shows up before it has landed. Two cases ask for
that: a screen behind a navigation guard, where a change counts only once the guard has let
it through, and a value that must never look stored while the browser is refusing to store
it.

A write that never lands is where the two sources part ways, as the table above says. A
navigation has a moment where it is over, so the URL takes the ref back with it. A storage
write has no such moment, so there is nowhere to hand the ref back at, and the value you
assigned stays until the entry changes to something other than what the state last read.
Clearing it instead would empty a field that is still being typed in, over a refusal the
person cannot do anything about.

The mode belongs to the state rather than to the key, so one param or one entry can be read
both ways at the same time. The input that edits a filter stays optimistic, while a summary
beside it takes `'source'` and reports only what actually landed.

## The source has the last word

Whatever a ref shows, the source decides in the end. A step back through the history, a
`router.push` from elsewhere, a write from another tab and a write through the storage
instance directly all replace the copy the state was holding. A ref can be briefly ahead of
its source, and it can never be left behind it.
