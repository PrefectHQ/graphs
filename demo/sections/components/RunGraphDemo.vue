<template>
  <p-layout-default class="run-graph-demo">
    <RunGraph :config="config" class="run-graph-demo__graph" />
  </p-layout-default>
</template>

<!-- eslint-disable camelcase -->
<script lang="ts" setup>
  import { parseISO, isValid } from 'date-fns'
  import RunGraph from '@/components/RunGraph.vue'
  import json from '@/demo/data/graph-small.json'
  import { RunGraphConfig, RunGraphData } from '@/models'

  // quick and dirty way to convert the iso strings into actual dates.
  function reviver(key: string, value: any): any {
    if (typeof value === 'string') {
      const date = parseISO(value)

      if (isValid(date)) {
        return date
      }
    }

    return value
  }

  const data: RunGraphData = JSON.parse(JSON.stringify(json), reviver)

  data.nodes = new Map(data.nodes)

  const config: RunGraphConfig = {
    runId: 'foo',
    fetch: () => data,
  }
</script>

<style>
.run-graph-demo__graph {
  width: 100%;
  height: 500px;
}
</style>