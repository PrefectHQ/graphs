<template>
  <main>
    <div ref="brainViewNode" class="brain-view" />
  </main>
</template>

<script setup>
  import ForceGraph3D from '3d-force-graph'
  import data from './nodes-basic.json'
  import { onMounted, ref } from 'vue'

  const brainViewNode = ref()

  onMounted(() => {
    if (brainViewNode.value) {
      const width = brainViewNode.value.clientWidth
      const height = brainViewNode.value.clientHeight

      const Graph = ForceGraph3D()(brainViewNode.value)
        .width(width)
        .height(height)
        .graphData(data)
        .nodeAutoColorBy(node => node['prefect.resource.role'].split('.').slice(0, 2).join('.'))
        .nodeLabel(node => `${node['prefect.resource.name']} - ${node['prefect.resource.id']}`)
        .nodeId('prefect.resource.id')
    }
  })
</script>

<style>
.brain-view {
  width: 100%;
  height: 100%;
}
</style>
