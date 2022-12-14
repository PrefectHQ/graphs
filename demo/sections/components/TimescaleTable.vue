<template>
  <p-table :data="data" :columns="columns">

    <template #label-heading >
      <span />
    </template>

    <template #label="{ row, value }">
      <div class="timescale-table--label-column">
        <div class="timescale-table--status"  :style="{ backgroundColor: row.color }" />
        <div class="timescale-table--label">{{ value }}</div>
      </div>
    </template>

    <template #start="{ value }">
      {{ value.toLocaleString() }}
    </template>

    <template #end="{ value }">
      {{ value.toLocaleString() }}
    </template>

    <template #duration="{ row }">
      {{ getDuration(row)?.toLocaleString() }}
    </template>

    <template #upstream="{ row }">
      {{ row?.upstream_dependencies?.length?.toLocaleString() }}
    </template>

    <template #empty-state>
      <p-empty-results>
        No data
      </p-empty-results>
    </template>
  </p-table>
</template>

<script lang="ts" setup>
import { TimescaleItem } from '@/demo/utilities/timescaleData'
import { secondsToApproximateString } from '@/utilities/time'

const props = defineProps<{
  data: TimescaleItem[]
}>()

const columns = [
  {
    label: 'Label',
    property: 'label',
  },
  {
    label: 'Start',
    property: 'start',
  },
  {
    label: 'End',
    property: 'end',
  },
  {
    label: 'Duration',
  },
  {
    label: 'Upstream',
  }
]

const getDuration = (row: TimescaleItem): string => {
  const start = row.start?.getTime()
  const end = row.end?.getTime()

  if (start && end) {
    return secondsToApproximateString((end - start) / 1000)
  }

  if (start) {
    return secondsToApproximateString((Date.now() - start) / 1000)
  }

  return '--'
}
</script>

<style>
.timescale-table--label-column { @apply
  flex
  items-center
  gap-2
}

.timescale-table--status {
  height: 16px;
  width: 16px;
}

.timescale-table--status { @apply
  rounded-full
}

.timescale-table--label { @apply
  text-slate-900
  font-medium
  text-base
}
</style>