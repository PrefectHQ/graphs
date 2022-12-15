<template>
  <p-table :data="data" :columns="columns">
    <template #label-heading>
      <span />
    </template>

    <template #label="{ row, value }">
      <div class="timescale-table__label-column">
        <div class="timescale-table__status" :style="{ backgroundColor: row.color }" />
        <div class="timescale-table__label" :title="value">
          {{ value }}
        </div>
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
      {{ row?.upstreamDependencies?.length?.toLocaleString() }}
    </template>

    <template #empty-state>
      <p-empty-results>
        No data
      </p-empty-results>
    </template>
  </p-table>
</template>

<script lang="ts" setup>
  import { withDefaults } from 'vue'
  import { TimescaleItem } from '@/demo/utilities/timescaleData'
  import { secondsToApproximateString } from '@/utilities/time'

  withDefaults(defineProps<{
    data?: TimescaleItem[],
  }>(),  {
    data: () => [],
  })

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
    },
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
.timescale-table__label-column {
  width: 200px;
}

.timescale-table__label-column { @apply
  flex
  items-center
  gap-2
}

.timescale-table__status {
  height: 16px;
  width: 16px;
}

.timescale-table__status { @apply
  rounded-full
}

.timescale-table__label { @apply
  text-slate-900
  font-medium
  text-base
  truncate
}
</style>