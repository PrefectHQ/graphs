<template>
  <div class="flow-run-graph">
    hello world
  </div>
</template>

<script lang="ts" setup>
  import { FlowRunGraphConfig } from '@/models/FlowRunGraph'

  defineProps<{
    config: FlowRunGraphConfig,
  }>()
</script>