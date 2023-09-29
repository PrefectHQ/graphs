<template>
  <div ref="stage" />
</template>

<script lang="ts" setup>
  import { onMounted, onUnmounted, ref, watch } from 'vue'
  import { RunGraphConfig } from '@/models/RunGraph'
  import { setScaleXZoom, start, stop } from '@/objects'
  import { WorkerMessage, worker } from '@/workers/runGraph'

  const props = defineProps<{
    config: RunGraphConfig,
    // this will be removed and handled internally to the component itself
    // this is just a POC for the demo
    zoom: number,
  }>()

  watch(() => props.zoom, zoom => {
    setScaleXZoom(zoom)
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