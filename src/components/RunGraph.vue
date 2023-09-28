<template>
  <canvas ref="canvas" />
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue'
  import { RunGraphConfig } from '@/models/RunGraph'
  import { createApplication } from '@/objects/application'
  import { WorkerMessage, worker } from '@/workers/runGraph'

  defineProps<{
    config: RunGraphConfig,
  }>()

  const canvas = ref<HTMLCanvasElement>()

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
    if (!canvas.value) {
      throw new Error('Canvas does not exist')
    }

    const view = canvas.value.transferControlToOffscreen()

    createApplication(view)

    if (process.env.NODE_ENV === 'development') {
      (globalThis as any).__PIXI_STAGE__ = canvas.value
    }
  })
</script>