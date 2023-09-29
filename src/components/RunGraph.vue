<template>
  <div ref="stage" />
</template>

<script lang="ts" setup>
  import { onMounted, onUnmounted, ref, watch } from 'vue'
  import { RunGraphConfig } from '@/models/RunGraph'
  import { setScaleXZoom, start, stop } from '@/objects'
  import { updateBox } from '@/objects/box'
  import { WorkerMessage, worker } from '@/workers/runGraph'

  const props = defineProps<{
    config: RunGraphConfig,
    zoom: number,
  }>()

  watch(() => props.zoom, zoom => {
    setScaleXZoom(zoom)
    updateBox()
  })

  const stage = ref<HTMLDivElement>()

  worker.onmessage = onMessage

  function onMessage({ data }: MessageEvent<WorkerMessage>): void {
    switch (data.type) {
      case 'pong':
        console.log('pong')
        return
      default:
        const exhaustive: never = data.type
        throw new Error(`data.type does not have a handler associated with it: ${exhaustive}`)
    }
  }

  onMounted(() => {
    if (!stage.value) {
      throw new Error('Stage does not exist')
    }

    start(stage.value)
  })

  onUnmounted(() => stop())
</script>