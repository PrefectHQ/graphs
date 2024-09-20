<template>
  <p-layout-resizable placement="bottom" class="trace-graph-demo">
    <GraphRoot v-model:viewport="visibleDateRange" :data :config="config" class="trace-graph-demo__graph" />

    <template #aside>
      <p-layout-resizable class="trace-graph-demo__data" placement="right">
        View 1

        <template #aside>
          <div>
            {{ visibleDateRange }}
          </div>
        </template>
      </p-layout-resizable>
    </template>
  </p-layout-resizable>
</template>

<script lang="ts" setup>
  import { useColorTheme } from '@prefecthq/prefect-design'
  import { parseISO, isValid } from 'date-fns'
  import { computed, ref } from 'vue'
  import GraphRoot from '@/components/GraphRoot.vue'
  import TraceData from '@/demo/data/graph-2k.json'
  import { GraphConfig, GraphData } from '@/models/Graph'
  import { ViewportDateRange } from '@/models/viewport'

  const { value: colorThemeValue } = useColorTheme()

  // quick and dirty way to convert the iso strings into actual dates.
  function reviver(key: string, value: unknown): unknown {
    if (typeof value === 'string') {
      const date = parseISO(value)

      if (isValid(date)) {
        return date
      }
    }

    // if (key === 'nodes') {
    //   return new Map(value)
    // }

    return value
  }

  function mapJsonToGraphData(json: unknown): GraphData {
    return JSON.parse(JSON.stringify(json), reviver)
  }

  const data = computed(() => mapJsonToGraphData(TraceData))
  const visibleDateRange = ref<ViewportDateRange>()

  const typeColors = {
    COMPLETED: '#219D4B',
    RUNNING: '#09439B',
    SCHEDULED: '#E08504',
    PENDING: '#554B58',
    FAILED: '#DE0529',
    CANCELLED: '#333333',
    CANCELLING: '#333333',
    CRASHED: '#EA580C',
    PAUSED: '#554B58',
  } satisfies Record<string, string>

  const documentStyles = getComputedStyle(document.documentElement)

  function getColorToken(cssVariable: string): string {
    return documentStyles.getPropertyValue(cssVariable).trim()
  }

  const config = computed<GraphConfig>(() => ({
    id: 'foo',
    styles: {
      colorMode: colorThemeValue.value,
      textDefault: getColorToken('--p-color-text-default'),
      textInverse: getColorToken('--p-color-text-inverse'),
      nodeToggleBorderColor: getColorToken('--p-color-button-default-border'),
      selectedBorderColor: getColorToken('--p-color-text-selected'),
      edgeColor: getColorToken('--p-color-text-subdued'),
      guideLineColor: getColorToken('--p-color-divider'),
      guideTextColor: getColorToken('--p-color-text-subdued'),
      // node: node => {
      //   // This could be a type guard downstream
      //   if ('type' in node.attributes && node.attributes.type && typeof node.attributes.type === 'string') {
      //     return {
      //       background: typeColors[node.attributes.type],
      //     }
      //   }
      // },
    },
  }))
</script>

<style>
.trace-graph-demo {
  height: calc(100vh - 64px);
  width: 100vw;
}

.trace-graph-demo { @apply
  rounded-lg
  overflow-hidden
  px-4
}

.trace-graph-demo__data .p-layout-resizable__main,
.trace-graph-demo__data .p-layout-resizable__aside { @apply
  rounded-lg
  p-4
}

.trace-graph-demo.p-layout-resizable--top,
.trace-graph-demo.p-layout-resizable--bottom {
  --p-layout-resizable-aside-size: 40vh;
  --p-layout-resizable-aside-max-size: 80vh;
  --p-layout-resizable-aside-min-size: 350px;
}

.trace-graph-demo .p-layout-resizable__handle--top,
.trace-graph-demo .p-layout-resizable__handle--bottom { @apply
  shadow-none
  h-2
}

.trace-graph-demo .p-layout-resizable__handle--left,
.trace-graph-demo .p-layout-resizable__handle--right { @apply
  shadow-none
  w-2
}

.trace-graph-demo__data.p-layout-resizable--left,
.trace-graph-demo__data.p-layout-resizable--right {
  --p-layout-resizable-aside-size: 40vw;
  --p-layout-resizable-aside-max-size: 60vw;
  --p-layout-resizable-aside-min-size: 350px;
}

.trace-graph-demo__data .p-layout-resizable__aside,
.trace-graph-demo__data .p-layout-resizable__main {
  background-color: var(--p-color-bg-1);
}


@screen lg {
  .trace-graph-demo {
    height: 100vh;
    width: 100vw;
  }
}

.trace-graph-demo__graph {
  width: 100%;
  height: 100%;
}
</style>