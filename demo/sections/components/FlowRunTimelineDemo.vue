<template>
  <main class="timeline">
    <div class="timeline__header">
      <div class="timeline__header-row">
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

      <div class="timeline__header-row">
        <p-label>
          Date Range
          <p-date-range-input v-model:start-date="start" v-model:end-date="end" />
        </p-label>
      </div>
    </div>

    <div class="timeline__graph-container">
      <FlowRunTimeline v-if="data" :key="componentKey" :graph-data="data" />
    </div>
  </main>
</template>

<script lang="ts" setup>
  import { ref, watchEffect, computed } from 'vue'
  import { generateTimescaleData, Shape, TimescaleItem } from '../../utilities/timescaleData'
  import FlowRunTimeline from '@/FlowRunTimeline.vue'

  const componentKey = ref(0)
  const today = new Date()
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)

  const size = ref(15)
  const fanMultiplier = ref(1.5)
  const shape = ref<Shape>('fanOut')
  const start = ref<Date>(twoDaysAgo)
  const end = ref<Date>(today)
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
    console.log('Data', data)
    data.value = generateTimescaleData(dataOptions.value).map((item) => {
      return {
        ...item,
        startTime: item.start,
        endTime: item.end || item.start,
      }
    }).sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

    // The graph isn't designed to be fully reactive, in the sense that it expects data to evolve,
    // but not completely change. This allows it to animate changes in nodes as the data updates.
    // So for demo purposes, when we get new data, we rerender the graph from scratch.
    componentKey.value += 1
  })
</script>

<style>
.timeline { @apply
  h-full
  flex
  flex-col
  gap-4
}

.timeline__header { @apply
  items-center
  text-sm
  rounded-lg
  text-slate-900
}

.timeline__{ @apply
  !rounded-t-none
}

.timeline__header-row { @apply
  flex
  gap-4
  items-center
  mb-4
}

.timeline__header-row:last-of-type { @apply
  mb-0
}

.timeline__graph-container { @apply
  flex-1
}
</style>
