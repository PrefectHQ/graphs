<template>
  <div class="graph-root">
    <div ref="stage" class="graph-root__stage" />
  </div>
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { GraphProps } from '@/models/Graph'
  import { GraphItemSelection } from '@/models/selection'
  import { ViewportDateRange } from '@/models/viewport'
  import { start, stop, centerViewport, updateViewportFromDateRange } from '@/objects'
  import { emitter } from '@/objects/events'

  const { viewport, config, data } = defineProps<GraphProps>()

  const emit = defineEmits<{
    (event: 'update:viewport', value: ViewportDateRange): void,
    (event: 'update:fullscreen', value: boolean): void,
    (event: 'update:selected', value: GraphItemSelection | null): void,
  }>()

  const stage = ref<HTMLDivElement>()

  watch(() => viewport, viewport => updateViewportFromDateRange(viewport))

  // emitter.on('itemSelected', nodeId => emit('update:selected', nodeId))


  emitter.on('viewportDateRangeUpdated', range => emit('update:viewport', range))

  function center(): void {
    centerViewport({ animate: true })
  }

  onMounted(() => {
    if (!stage.value) {
      throw new Error('Stage does not exist')
    }

    start({
      stage: stage.value,
      props: { config, data, viewport },
    })
  })

  onBeforeUnmount(() => {
    stop()
  })
</script>

<style>
.graph-root__stage,
.graph-root__stage > canvas {
  width: 100%;
  height: 100%;
}
</style>