<template>
  <p-table :data="data" :columns="columns" />
</template>

<script lang="ts" setup>
import { TimescaleItem } from '@/demo/utilities/timescaleData'

const props = defineProps<{
  data: TimescaleItem[]
}>()

const columns = [
  {
    label: 'ID',
    property: 'id',
  },
  {
    label: 'Name',
    property: 'name',
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
    label: '',
  }
]
</script>