<template>
  <p-layout-default class="run-graph-demo">
    <RunGraph v-model:viewport="visibleDateRange" v-model:selected="selected" :config="config" class="run-graph-demo__graph p-background" />
    {{ visibleDateRange }} {{ selected }}
  </p-layout-default>
</template>

<script lang="ts" setup>
  import { useColorTheme } from '@prefecthq/prefect-design'
  import { parseISO, isValid } from 'date-fns'
  import { computed, ref } from 'vue'
  import RunGraph from '@/components/RunGraph.vue'
  import json from '@/demo/data/graph-small.json'
  import { RunGraphConfig, RunGraphData, RunGraphStyles } from '@/models'
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
  const selected = ref()

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

  const styleOverrides = computed<Partial<RunGraphStyles>>(() => ({
    textDefault: getColorToken('--p-color-text-default'),
    nodeSelectedBorderColor: getColorToken('--p-color-selected'),
    guideLineColor: getColorToken('--p-color-text-default'),
  }))

  const config = computed<RunGraphConfig>(() => ({
    runId: 'foo',
    fetch: () => data,
    styles: {
      ...styleOverrides.value,
      node: node => ({
        background: stateTypeColors[node.state_type],
        colorOnBackground: colorThemeValue.value === 'light'
          ? getColorToken('--p-color-text-inverse')
          : getColorToken('--p-color-text-default'),
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