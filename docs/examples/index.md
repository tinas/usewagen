# Pagination

A page number is the smallest piece of state that belongs in the URL. `parseAsInteger` makes
it a number, and `withDefault(1)` says what a URL without the param means.

<script setup>
import Pagination from './demos/pagination.vue'
</script>

<RouteDemo :demo="Pagination" />

::: details Show code

<<< ./demos/pagination.vue

:::

Every demo on these pages runs in a router of its own, so the bar above it is the URL that
demo is looking at, not the one in your address bar. The storage demos write to this site's
storage under a `docs:` prefix.

Moving to the second page writes `?page=2`. Coming back to the first one removes the param,
because a URL without it already means page one. Every write replaces the current history
entry rather than adding one, which is why Back stays disabled here.
[Tabs](/examples/tabs) shows the other setting.
