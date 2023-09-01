<template>
  <main class="flow-run-timeline-demo">
    <div class="flex h-full">
      <div class="flow-run-timeline-demo__graph-container">
        <FlowRunTimeline
          v-if="data"
          ref="graph"
          :key="componentKey"
          :graph-data="data"
          :is-running="isRunning"
          :theme="theme"
          :layout="layout"
          :hide-edges="hideEdges"
          class="flow-run-timeline-demo-demo__graph p-background"
          :selected-node-id="selectedNodeId"
          :expanded-sub-nodes="expandedSubFlows"
          @selection="selectNode"
          @sub-node-toggle="toggleSubFlow"
        />
      </div>

      <div v-if="selectedNodeId" class="flow-run-timeline-demo__selection-panel" :class="classes">
        <p-label>
          Selected Node
          <p-text-input v-model="selectedNodeId" />
        </p-label>
      </div>
    </div>
    <div class="flow-run-timeline-demo__header-row">
      <p-label>
        Layout
        <p-select
          v-model="layout"
          :options="layoutOptions"
        />
      </p-label>
      <div class="flow-run-timeline-demo__checkbox-wrapper">
        <p-checkbox v-model="hideEdges" label="Hide Edges" />
      </div>
      <p-button secondary @click="centerViewport">
        Recenter
      </p-button>
    </div>
    <hr>
    <div class="flow-run-timeline-demo__header">
      <div class="flow-run-timeline-demo__header-row">
        <p-label>
          Nodes
          <p-number-input v-model="size" step="1" min="1" max="1000" />
        </p-label>

        <p-label>
          Shape
          <p-select v-model="shape" :options="shapeOptions" />
        </p-label>

        <p-label>
          Fan Multiplier
          <p-number-input v-model="fanMultiplier" step="0.1" min="1" max="2" />
        </p-label>

        <p-label>
          Sub Flow Potential
          <p-number-input v-model="subFlowOccurrences" step="1" min="0" max="100" append="%" />
        </p-label>
      </div>

      <div class="flow-run-timeline-demo__header-row">
        <p-label>
          Date Range
          <p-date-range-input v-model:start-date="start" v-model:end-date="end" />
        </p-label>
        <div class="flow-run-timeline-demo__checkbox-wrapper">
          <p-checkbox v-model="slowFeedData" label="Slow Feed Data" />
        </div>
        <div class="flow-run-timeline-demo__checkbox-wrapper">
          <p-checkbox v-model="zeroTimeGap" label="Zero Time Gap" />
        </div>
        <div class="flow-run-timeline-demo__checkbox-wrapper">
          <p-checkbox v-model="isRunning" label="Show Running" />
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts" setup>
  import { useColorTheme } from '@prefecthq/prefect-design'
  import { ref, watchEffect, computed } from 'vue'
  import { generateTimescaleData, Shape } from '../../utilities/timescaleData'
  import FlowRunTimeline from '@/FlowRunTimeline.vue'
  import {
    TimelineThemeOptions,
    TimelineNodesLayoutOptions,
    ThemeStyleOverrides,
    ExpandedSubNodes,
    GraphTimelineNode,
    NodeSelectionEvent,
    HEX
  } from '@/models'

  const { value: colorThemeValue } = useColorTheme()

  const graph = ref<InstanceType<typeof FlowRunTimeline> | null>(null)
  const isRunning = ref(false)
  const componentKey = ref(0)
  const now = new Date()
  const previous = new Date(now.getTime() - 1000 * 200)
  const selectedNodeId = ref<string | null>(null)
  const expandedSubFlows = ref<ExpandedSubNodes>(new Map())
  const hideEdges = ref(false)

  const size = ref(10)
  const fanMultiplier = ref(1.5)
  const subFlowOccurrences = ref(80)
  const shape = ref<Shape>('fanOut')
  const start = ref<Date>(previous)
  const end = ref<Date>(now)
  const shapeOptions: Shape[] = ['linear', 'fanOut', 'fanOutIn']
  const slowFeedData = ref(false)
  const zeroTimeGap = ref(true)
  const layoutOptions: TimelineNodesLayoutOptions[] = ['waterfall', 'nearestParent']
  const layout = ref<TimelineNodesLayoutOptions>('nearestParent')

  const dataOptions = computed(() => {
    return {
      size: size.value,
      shape: shape.value,
      fanMultiplier: fanMultiplier.value,
      subFlowOccurrence: subFlowOccurrences.value / 100,
      start: start.value,
      end: end.value,
      zeroTimeGap: zeroTimeGap.value,
    }
  })

  const data = ref<GraphTimelineNode[]>([])

  const slowlySetData = (graphData: GraphTimelineNode[], count: number = 1): void => {
    const newData = graphData.filter((item, index) => index <= count)

    if (count === 1) {
      data.value = newData
      slowlySetData(graphData, count + 1)
      return
    }

    setTimeout(() => {
      data.value = newData
      if (count < graphData.length) {
        slowlySetData(graphData, count + 1)
      }
    }, 1000)
  }

  watchEffect(() => {
    const generatedData = generateTimescaleData(dataOptions.value)
    if (slowFeedData.value) {
      slowlySetData(generatedData)
    } else {
      data.value = generateTimescaleData(dataOptions.value)
    }


    if (isRunning.value) {
      const lastItem = data.value[data.value.length - 1]
      lastItem.end = null
      lastItem.state = 'running'
    }

    // The graph isn't designed to be fully reactive, in the sense that it expects data to evolve,
    // but not completely change. This allows it to animate changes in nodes as the data updates.
    // So for demo purposes, when we get new data, we rerender the graph from scratch.
    componentKey.value += 1
    selectedNodeId.value = null
    expandedSubFlows.value = new Map()
  })

  const selectNode = (event: NodeSelectionEvent | null): void => {
    if (selectedNodeId.value === event?.id) {
      selectedNodeId.value = null
    } else {
      selectedNodeId.value = event?.id ?? null
    }
  }

  const toggleSubFlow = (value: string): void => {
    const isValueVisible = expandedSubFlows.value.has(value)

    if (isValueVisible) {
      expandedSubFlows.value.delete(value)
      return
    }

    expandedSubFlows.value.set(value, {
      data: [],
    })

    // timeout simulates the delay while requesting subflow data.
    setTimeout(() => {
      if (expandedSubFlows.value.has(value)) {
        let nodeData = data.value.find(item => item.subFlowRunId === value)
        if (!nodeData) {
          expandedSubFlows.value.forEach((subFlowData) => {
            const match = 'value' in subFlowData.data
              ? subFlowData.data.value.find(item => item.subFlowRunId === value)
              : subFlowData.data.find(item => item.subFlowRunId === value)
            if (match) {
              nodeData = match
            }
          })
        }

        if (!nodeData) {
          throw new Error('Could not find node data')
        }

        const subFlowDataOptions = {
          ...dataOptions.value,
          size: Math.floor(Math.random() * 5) + 1,
          start: new Date(nodeData.start!),
          end: nodeData.end ? new Date(nodeData.end) : new Date(),
        }
        const subFlowData = generateTimescaleData(subFlowDataOptions)

        expandedSubFlows.value.set(value, {
          data: subFlowData,
        })
      }
    }, 400)
  }

  const centerViewport = (): void => {
    graph.value?.centerViewport()
  }

  const classes = computed(() => ({
    'flow-run-timeline-demo__selection-panel--open': selectedNodeId.value,
  }))

  const stateColors: Record<string, string> = {
    'completed': '#00a63d',
    'running': '#00a8ef',
    'scheduled': '#60758d',
    'pending': '#60758d',
    'failed': '#f00011',
    'cancelled': '#f00011',
    'crashed': '#f00011',
    'paused': '#f4b000',
  }

  const computedStyle = getComputedStyle(document.documentElement)

  const colorDefaults = computed<Partial<ThemeStyleOverrides>>(() => {
    let colorTextDefault = computedStyle.getPropertyValue('--p-color-text-default').trim() as HEX,
        colorTextInverse = computedStyle.getPropertyValue('--p-color-text-default').trim() as HEX
    const colorTextSubdued = computedStyle.getPropertyValue('--p-color-text-subdued').trim() as HEX,
          colorGuideLine = computedStyle.getPropertyValue('--p-color-divider').trim() as HEX,
          colorEdge = computedStyle.getPropertyValue('--p-color-text-subdued').trim() as HEX,
          colorButtonBg = computedStyle.getPropertyValue('--p-color-button-default-bg').trim() as HEX,
          colorButtonBgHover = computedStyle.getPropertyValue('--p-color-button-default-bg-hover').trim() as HEX,
          colorButtonBorder = computedStyle.getPropertyValue('--p-color-button-default-border').trim() as HEX

    if (colorThemeValue.value === 'light') {
      colorTextDefault = computedStyle.getPropertyValue('--p-color-text-default').trim() as HEX
      colorTextInverse = computedStyle.getPropertyValue('--p-color-text-inverse').trim() as HEX
    }

    return {
      colorTextDefault,
      colorTextInverse,
      colorTextSubdued,
      colorGuideLine,
      colorEdge,
      colorButtonBg,
      colorButtonBgHover,
      colorButtonBorder,
    }
  })

  const theme = computed<TimelineThemeOptions>((): TimelineThemeOptions => {
    return {
      node: (node) => {
        return {
          fill: stateColors[node.state],
          onFillSubNodeToggleHoverBg: '#000000',
          onFillSubNodeToggleHoverBgAlpha: 0.4,
          inverseTextOnFill: true,
        }
      },
      defaults: colorDefaults.value,
    }
  })
</script>

<style>
.flow-run-timeline-demo { @apply
  h-full
  flex
  flex-col
  gap-4
  relative
}

.flow-run-timeline-demo hr { @apply
  border-0
  border-t
  border-divider
}

.flow-run-timeline-demo__header { @apply
  items-center
  text-sm
  rounded-lg
}

.flow-run-timeline-demo__header-row { @apply
  flex
  gap-4
  items-end
}

.flow-run-timeline-demo__header-row + .flow-run-timeline-demo__header-row { @apply
  mt-4
}

.flow-run-timeline-demo__checkbox-wrapper { @apply
  min-w-fit
  pb-2
}

.flow-run-timeline-demo__graph-container { @apply
  flex-1
}

.flow-run-timeline-demo-demo__graph { @apply
  rounded-xl
}

.flow-run-timeline-demo__selection-panel { @apply
  w-0
  py-4
  rounded-lg
  overflow-hidden
  transition-all
  duration-500
  opacity-0
}

.flow-run-timeline-demo__selection-panel--open { @apply
  border
  dark:border-divider
  w-96
  ml-2
  px-4
  opacity-100
  overflow-auto
}
</style>
