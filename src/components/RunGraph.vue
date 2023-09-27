<template>
  <div class="run-graph">
    hello world
  </div>
</template>

<script lang="ts" setup>
  import { RunGraphConfig } from '@/models/RunGraph'

  defineProps<{
    config: RunGraphConfig,
  }>()
</script>