<template>
  <main>
    <TimescaleTable :data="data" />
  </main>
</template>

<script lang="ts" setup>
import { generateTimescaleData } from '../utilities/timescaleData';
import TimescaleTable from './components/TimescaleTable.vue';

const data = generateTimescaleData({ size: 50 })
</script>