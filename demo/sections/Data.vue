<template>
  <main>
    <div class="data__table-header">
      <div class="data__table-header-row">
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

      <div class="data__table-header-row">
        <p-label>
          Date Range
          <p-date-range-input v-model:start-date="start" v-model:end-date="end" />
        </p-label>
      </div>
    </div>

    <TimescaleTable class="data__table" :data="data" />
  </main>
</template>

<script lang="ts" setup>
  import { ref, watchEffect, computed } from 'vue'
  import { generateTimescaleData, Shape, TimescaleItem } from '../utilities/timescaleData'
  import TimescaleTable from './components/TimescaleTable.vue'

  const size = ref(50)
  const fanMultiplier = ref(1.5)
  const shape = ref<Shape>('fanOut')
  const start = ref<Date>()
  const end = ref<Date>()
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
    data.value = generateTimescaleData(dataOptions.value)
  })
</script>

<style>
.data__table-header { @apply
  items-center
  text-sm
  p-4
  shadow
  ring-1
  ring-black
  ring-opacity-5
  rounded-lg
  rounded-b-none
  sticky
  top-0
  text-slate-900
  bg-slate-100
}

.data__table { @apply
  !rounded-t-none
}

.data__table-header-row { @apply
  flex
  gap-4
  items-center
  mb-4
}

.data__table-header-row:last-of-type { @apply
  mb-0
}
</style>