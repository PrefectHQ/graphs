<template>
  <p-layout-default class="run-graph-demo">
    <RunGraph v-model:viewport="visibleDateRange" v-model:selected="selected" :config="config" class="run-graph-demo__graph p-background" />
    {{ visibleDateRange }} {{ selected }}
    <p-drawer v-model:open="artifactDrawerOpen" placement="right" class="p-background p-4">
      <span class="text-sm text-subdued">Inspecting</span>
      <h2 class="mb-2">
        {{ selected?.id }}
      </h2>
      <span class="text-sm text-subdued">Stuff</span>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Eaque recusandae ad, nam hic ipsam est dolor cumque optio nostrum quaerat?</p>
    </p-drawer>
  </p-layout-default>
</template>

<script lang="ts" setup>
  import { useColorTheme } from '@prefecthq/prefect-design'
  import { parseISO, isValid } from 'date-fns'
  import { computed, ref } from 'vue'
  import RunGraph from '@/components/RunGraph.vue'
  import json from '@/demo/data/graph-small.json'
  import { GraphItemSelection, RunGraphConfig, RunGraphData } from '@/models'
  import { StateType } from '@/models/states'
  import { ViewportDateRange } from '@/models/viewport'

  const { value: colorThemeValue } = useColorTheme()

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

  const data: RunGraphData = JSON.parse(JSON.stringify(json), reviver)
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
    fetch: () => data,
    styles: {
      colorMode: colorThemeValue.value,
      textDefault: getColorToken('--p-color-text-default'),
      textInverse: getColorToken('--p-color-text-inverse'),
      nodeToggleBorderColor: getColorToken('--p-color-button-default-border'),
      selectedBorderColor: getColorToken('--p-color-text-selected'),
      edgeColor: getColorToken('--p-color-text-subdued'),
      guideLineColor: getColorToken('--p-color-divider'),
      guideTextColor: getColorToken('--p-color-text-subdued'),
      node: node => ({
        background: stateTypeColors[node.state_type],
      }),
    },
  }))
</script>

<style>
.run-graph-demo__graph {
  width: 100%;
  height: 500px;
}
</style>