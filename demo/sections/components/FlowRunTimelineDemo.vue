<template>
  <main class="flow-run-timeline-demo">
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
      </div>

      <div class="flow-run-timeline-demo__header-row">
        <p-label>
          Date Range
          <p-date-range-input v-model:start-date="start" v-model:end-date="end" />
        </p-label>
        <div class="flow-run-timeline-demo__header-row__checkbox-wrapper">
          <p-checkbox v-model="isRunning" label="Show Running" />
        </div>
      </div>
    </div>

    <div class="flow-run-timeline-demo__graph-container">
      <FlowRunTimeline
        v-if="data"
        :key="componentKey"
        :graph-data="data"
        :is-running="isRunning"
        :theme="theme"
        class="flow-run-timeline-demo-demo__graph"
        :selected-node-id="selectedNodeId"
        @click="selectNode"
      />
    </div>
    <div v-if="selectedNodeId" class="flow-run-timeline-demo__selection-panel">
      <p-label>
        Selected Node
        <p-text-input v-model="selectedNodeId" />
      </p-label>
    </div>
  </main>
</template>

<script lang="ts" setup>
  import { useColorTheme } from '@prefecthq/prefect-design'
  import { ref, watchEffect, computed } from 'vue'
  import { generateTimescaleData, Shape, TimescaleItem } from '../../utilities/timescaleData'
  import FlowRunTimeline from '@/FlowRunTimeline.vue'
  import { TimelineThemeOptions, HSL } from '@/models'

  const { value: colorThemeValue } = useColorTheme()

  const isRunning = ref(false)
  const componentKey = ref(0)
  const now = new Date()
  const previous = new Date(now.getTime() - 1000 * 200)
  const selectedNodeId = ref<string | null>(null)

  const size = ref(15)
  const fanMultiplier = ref(1.5)
  const shape = ref<Shape>('fanOut')
  const start = ref<Date>(previous)
  const end = ref<Date>(now)
  const shapeOptions: Shape[] = ['linear', 'fanOut', 'fanOutIn']

  const dataOptions = computed(() => {
    return {
      size: size.value,
      shape: shape.value,
      fanMultiplier: fanMultiplier.value,
      start: start.value,
      end: end.value,
    }
  })

  const data = ref<TimescaleItem[]>([])

  watchEffect(() => {
    // set data and sort by startTime
    data.value = generateTimescaleData(dataOptions.value)

    if (isRunning.value) {
      const lastItem = data.value[data.value.length - 1]
      lastItem.end = null
      lastItem.state = 'running'
    }

    // The graph isn't designed to be fully reactive, in the sense that it expects data to evolve,
    // but not completely change. This allows it to animate changes in nodes as the data updates.
    // So for demo purposes, when we get new data, we rerender the graph from scratch.
    componentKey.value += 1
  })

  const selectNode = (value: string | null): void => {
    if (selectedNodeId.value === value) {
      selectedNodeId.value = null
    } else {
      selectedNodeId.value = value
    }
  }

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

  const colorDefaults = computed<{
    colorTextDefault: HSL,
    colorTextInverse: HSL,
    colorTextSubdued: HSL,
  }>(() => {
    let colorTextDefault = '--foreground',
        colorTextInverse = '--white',
        colorTextSubdued = '--foreground-300'

    if (colorThemeValue.value == 'dark') {
      colorTextDefault = '--white'
      colorTextInverse = '--foreground-600'
      colorTextSubdued = '--foreground-200'
    }

    const [defaultH, defaultS, defaultL] = computedStyle.getPropertyValue(colorTextDefault).trim().split(' ')
    const [inverseH, inverseS, inverseL] = computedStyle.getPropertyValue(colorTextInverse).trim().split(' ')
    const [subduedH, subduedS, subduedL] = computedStyle.getPropertyValue(colorTextSubdued).trim().split(' ')

    return {
      colorTextDefault: `hsl(${defaultH}, ${defaultS}, ${defaultL})`,
      colorTextInverse: `hsl(${inverseH}, ${inverseS}, ${inverseL})`,
      colorTextSubdued: `hsl(${subduedH}, ${subduedS}, ${subduedL})`,
    }
  })

  const theme = computed<TimelineThemeOptions>(() => {
    return {
      node: (node) => {
        return {
          fill: stateColors[node.state],
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

.flow-run-timeline-demo__header { @apply
  items-center
  text-sm
  rounded-lg
  text-foreground-600
}

.flow-run-timeline-demo__{ @apply
  !rounded-t-none
}

.flow-run-timeline-demo__header-row { @apply
  flex
  gap-4
  items-center
  mb-4
}

.flow-run-timeline-demo__header-row:last-of-type { @apply
  mb-0
}

.flow-run-timeline-demo__header-row__checkbox-wrapper { @apply
  min-w-fit
  pt-5
}

.flow-run-timeline-demo__graph-container { @apply
  flex-1
}

.flow-run-timeline-demo-demo__graph { @apply
  bg-background-600
  dark:bg-background
  rounded-xl
}

.flow-run-timeline-demo__selection-panel { @apply
  absolute
  bottom-1
  left-1
  text-foreground
}
</style>
