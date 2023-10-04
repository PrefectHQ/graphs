<template>
  <p-layout-default class="run-graph-demo">
    <RunGraph :config="config" class="run-graph-demo__graph" />
    <!-- <p-number-input v-model="zoom" /> -->
  </p-layout-default>
</template>

<!-- eslint-disable camelcase -->
<script lang="ts" setup>
  import { randomId } from '@prefecthq/prefect-design'
  import { endOfHour, startOfHour, startOfDay, endOfDay } from 'date-fns'
  // import { ref } from 'vue'
  import RunGraph from '@/components/RunGraph.vue'
  import { RunGraphConfig, RunGraphData } from '@/models'

  // const zoom = ref(0)
  const now = new Date()

  const dummy: RunGraphData = {
    start_time: startOfDay(now),
    end_time: endOfDay(now),
    root_node_ids: [],
    nodes: new Map([
      [
        randomId(), {
          start_time: startOfHour(now),
          end_time: endOfHour(now),
          kind: 'task-run',
          state_name: 'Completed',
          label: 'bar',
          child_ids: [],
          parent_ids: [],
          id: randomId(),
        },
      ],
    ]),
  }

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