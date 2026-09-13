# Form draft

A half filled form is worth keeping while the tab is open and not a minute longer, which is
what `sessionStorage` is for. `parseAsJson` carries the shape.

<script setup>
import Draft from './demos/draft.vue'
</script>

<StorageDemo :demo="Draft" area="session" />

::: details Show code

<<< ./demos/draft.vue

:::

The entry holds the JSON string the bar shows, and the ref hands the component a `Draft`.
Discard writes `null`, which removes the entry, and the state falls back to the empty draft
its default describes.
