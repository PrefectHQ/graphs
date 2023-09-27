<template>
  <p-layout-default class="flow-run-graph-demo">
    <FlowRunGraph :config="config" />
  </p-layout-default>
</template>

<script lang="ts" setup>
  import FlowRunGraph from '@/components/FlowRunGraph.vue'
  import { FlowRunGraphConfig } from '@/models'

  const dummy: any = {}

  const config: FlowRunGraphConfig = {
    flowRunId: 'foo',
    fetch: () => dummy,
  }
</script>