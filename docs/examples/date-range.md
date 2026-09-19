# Date range

A period is two params, `startDate` and `endDate`, with one rule between them: the start
never comes after the end. The rule belongs to the pair rather than to either date, so it
lives in a `computed` over the two states and not in a parser.

<script setup>
import DateRange from './demos/date-range.vue'
</script>

<RouteDemo :demo="DateRange" />

::: details Show code

<<< ./demos/date-range.vue

:::

`range` is the pair the component works with, and it is what a range picker that takes both
dates as one `v-model` binds to. Reading it puts the two params together, and writing it hands
both to `set`, so the URL never carries a pair that is half updated. Pick a start after the end
above: the two dates land swapped, in one navigation.

A URL edited by hand into the wrong order reads as `null`, the same way a param the parser
refuses reads as missing, and it is left as it is until the next write. A parser answers for
the one string it is given, and a rule over two strings has to wait until both are read, which
is what the `computed` adds. Nothing else is needed, because the pair is still a function of
the URL and nothing beside it.

## One param instead

When the shape of the URL is yours to choose, the pair can be one param, and then the parser
owns the rule.

```ts
import { defineParser, parseAsDate } from 'usewagen'
import { useRouteState } from 'usewagen/router'

const parseAsDateRange = defineParser<[Date, Date]>({
  parse: raw => {
    const [start, end] = raw.split('..').map(parseAsDate.parse)
    return start && end && start <= end ? [start, end] : null
  },
  serialize: ([start, end]) => `${parseAsDate.serialize(start)}..${parseAsDate.serialize(end)}`,
})

const range = useRouteState({ key: 'range', parser: parseAsDateRange })
```

`?range=2026-01-01..2026-01-31` reads as the pair and anything else as `null`. Two params keep
each date readable on its own and match what an existing link or API already uses; one param
keeps the rule where the type is decided. Either way the rule is written once.
