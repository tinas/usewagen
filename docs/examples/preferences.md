# Preferences

A setting the user picks once belongs in `localStorage`, where it survives a reload and a
closed browser.

<script setup>
import Theme from './demos/theme.vue'
</script>

<StorageDemo :demo="Theme" />

::: details Show code

<<< ./demos/theme.vue

:::

The bar above shows the entry as it is stored, prefix included. Choosing the dark theme
writes it, and choosing the light one removes the entry, since a missing entry already reads
as `light`.

Local storage is shared by every tab of a site. Open this page in a second tab and change the
theme there: the demo in this one follows.
