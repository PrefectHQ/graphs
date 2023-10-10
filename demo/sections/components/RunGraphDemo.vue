<template>
  <p-layout-default class="run-graph-demo">
    <RunGraph v-model:visible-date-range="visibleDateRange" :config="config" class="run-graph-demo__graph p-background" />
    {{ visibleDateRange }}
  </p-layout-default>
</template>

<script lang="ts" setup>
  import { parseISO, isValid } from 'date-fns'
  import { ref } from 'vue'
  import RunGraph from '@/components/RunGraph.vue'
  import json from '@/demo/data/graph-small.json'
  import { RunGraphConfig, RunGraphData } from '@/models'
  import { StateType } from '@/models/states'
  import { ScaleXDomain } from '@/objects'

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
  const visibleDateRange = ref<ScaleXDomain>()

  data.nodes = new Map(data.nodes)

  // just hard coding the values here for now. these will come from ui-library
  const stateTypeColors = {
    completed: '#219D4B',
    running: '#09439B',
    scheduled: '#E08504',
    pending: '#554B58',
    failed: '#DE0529',
    cancelled: '#333333',
    cancelling: '#333333',
    crashed: '#EA580C',
    paused: '#554B58',
  } satisfies Record<StateType, string>

  const config: RunGraphConfig = {
    runId: 'foo',
    fetch: () => data,
    styles: {
      node: node => ({
        background: stateTypeColors[node.state_type],
      }),
    },
  }
</script>

<style>
.run-graph-demo__graph {
  width: 100%;
  height: 500px;
}
</style>