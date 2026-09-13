# Tabs

A tab that lives in the URL is a tab you can link to. `parseAsStringLiteral` keeps the value
to the tabs that exist, and `history: 'push'` makes each one a step the back button undoes.

<script setup>
import Tabs from './demos/tabs.vue'
</script>

<RouteDemo :demo="Tabs" />

::: details Show code

<<< ./demos/tabs.vue

:::

`tab` is typed as `'overview' | 'activity' | 'settings'`, so a URL carrying anything else
falls back to the default rather than reaching the component. The default tab is not written
to the URL at all, which is why the first tab shows an address without a param.
