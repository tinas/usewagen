# Filters

A search field, a set of tags and a page number are three params that change together.
`useRouteStates` describes them in one place and returns a ref for each.

<script setup>
import Filters from './demos/filters.vue'
</script>

<RouteDemo :demo="Filters" />

::: details Show code

<<< ./demos/filters.vue

:::

Typing writes `?q=` on every keystroke. Picking a tag writes the tags and resets the page,
and the two land in the URL together, because `set` writes a patch in one navigation.

Unchecking the last tag removes `?tags=` rather than writing an empty list, the same way
going back to page one removes `?page=`. Reset does it for every key at once.
