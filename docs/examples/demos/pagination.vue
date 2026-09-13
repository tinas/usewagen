<script setup lang="ts">
import { parseAsInteger } from 'usewagen'
import { useRouteState } from 'usewagen/router'

const page = useRouteState({ key: 'page', parser: parseAsInteger.withDefault(1) })
</script>

<template>
  <div class="demo-row">
    <button :disabled="page === 1" @click="page--">Previous</button>
    <span>Page {{ page }}</span>
    <button @click="page++">Next</button>
  </div>
</template>
