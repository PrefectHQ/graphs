<template>
  <p-layout-default class="run-graph-demo">
    <RunGraph :config="config" class="run-graph-demo__graph" />
  </p-layout-default>
</template>

<script lang="ts" setup>
  import RunGraph from '@/components/RunGraph.vue'
  import { RunGraphConfig } from '@/models'

  const dummy: any = {}

  const config: RunGraphConfig = {
    runId: 'foo',
    fetch: () => dummy,
  }
</script>

<style>
.run-graph-demo__graph {
  width: 100%;
  height: 500px;
}
</style>