<template>
  <p-layout-default class="run-graph-demo">
    <p-label label="Choose a Dataset">
      <p-button-group v-model="selectedDataset" :options="datasetOptions as unknown as Array<string>" small />
    </p-label>

    <RunGraph :key="remountKey" v-model:viewport="visibleDateRange" v-model:selected="selected" :config="config" class="run-graph-demo__graph p-background" />
    {{ visibleDateRange }} {{ selected }}

    <p-drawer v-model:open="artifactDrawerOpen" placement="right" class="p-background p-4">
      <span class="text-sm text-subdued">Inspecting</span>
      <h2 class="mb-2">
        {{ selected && 'id' in selected ? selected.id : selected?.ids.join(', ') }}
      </h2>
      <span class="text-sm text-subdued">Stuff</span>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Eaque recusandae ad, nam hic ipsam est dolor cumque optio nostrum quaerat?</p>
    </p-drawer>
  </p-layout-default>
</template>

<script lang="ts" setup>
  import { GraphItemSelection, RunGraphConfig, RunGraphData, RunGraphEvent, StateType, ViewportDateRange } from '@prefecthq/graphs'
  import { parseISO, isValid } from 'date-fns'
  import { computed, ref, watch } from 'vue'
  import graph2kJson from '@/data/graph-2k.json'
  import graphSmallLongJson from '@/data/graph-small-long.json'
  import graphSmallJson from '@/data/graph-small.json'
  import eventsJson from '@/data/graph-small_events.json'
  import graphSubflowsJson from '@/data/graph-subflows.json'
  import graphXsmallProgressArtifactsJson from '@/data/graph-xsmall-progress-artifacts.json'
  import graphXsmallJson from '@/data/graph-xsmall.json'
  import RunGraph from '@/components/RunGraph.vue'

  // quick and dirty way to convert the iso strings into actual dates.
  function reviver(key: string, value: any): any {
    if (typeof value === 'string') {
      const date = parseISO(value)

      if (isValid(date)) {
        return date
      }
    }

    if (key === 'nodes') {
      return new Map(value)
    }

    return value
  }

  function parseJson(json: unknown): unknown {
    return JSON.parse(JSON.stringify(json), reviver)
  }

  function getData(json: unknown): RunGraphData {
    return parseJson(json) as RunGraphData
  }

  const datasetOptions = ['2k', 'small', 'small (long)', 'subflows', 'xsmall', 'xsmall (w/ progress artifacts)'] as const
  type DatasetOption = typeof datasetOptions[number]
  const datasetMap: Record<DatasetOption, RunGraphData> = {
    '2k': getData(graph2kJson),
    'small': getData(graphSmallJson),
    'small (long)': getData(graphSmallLongJson),
    'subflows': getData(graphSubflowsJson),
    'xsmall': getData(graphXsmallJson),
    'xsmall (w/ progress artifacts)': getData(graphXsmallProgressArtifactsJson),
  }
  const selectedDataset = ref<DatasetOption>('xsmall (w/ progress artifacts)')

  // force remounting the graph when the dataset changes
  const remountKey = ref(0)
  watch(() => selectedDataset.value, () => remountKey.value ^= 1)

  const data = computed<RunGraphData>(() => datasetMap[selectedDataset.value])
  const eventsData = parseJson(eventsJson) as RunGraphEvent[]
  const visibleDateRange = ref<ViewportDateRange>()
  const selected = ref<GraphItemSelection | null>(null)

  const artifactDrawerOpen = computed({
    get: (): boolean => {
      return !!selected.value && selected.value.kind === 'artifact'
    },
    set: (): void => {
      selected.value = null
    },
  })

  // just hard coding the values here for now. these will come from ui-library
  const stateTypeColors = {
    COMPLETED: '#219D4B',
    RUNNING: '#09439B',
    SCHEDULED: '#E08504',
    PENDING: '#554B58',
    FAILED: '#DE0529',
    CANCELLED: '#333333',
    CANCELLING: '#333333',
    CRASHED: '#EA580C',
    PAUSED: '#554B58',
  } satisfies Record<StateType, string>

  const documentStyles = getComputedStyle(document.documentElement)

  function getColorToken(cssVariable: string): string {
    return documentStyles.getPropertyValue(cssVariable).trim()
  }

  const config = computed<RunGraphConfig>(() => ({
    runId: 'foo',
    fetch: () => data.value,
    fetchEvents: () => eventsData,
    theme: 'dark',
    styles: () => ({
      node: node => ({
        background: stateTypeColors[node.state_type],
      }),
      state: state => ({
        background: stateTypeColors[state.type],
      }),
    }),
  }))
</script>

<style>
.run-graph-demo__graph {
  width: 100%;
  height: 500px;
}
</style>