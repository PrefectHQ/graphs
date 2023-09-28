<template>
  <canvas ref="canvas" />
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue'
  import { RunGraphConfig } from '@/models/RunGraph'
  import { WorkerMessage, worker } from '@/workers/runGraph'

  defineProps<{
    config: RunGraphConfig,
  }>()

  const canvas = ref<HTMLCanvasElement>()

  function onMessage({ data }: MessageEvent<WorkerMessage>): void {
    switch (data.type) {
      case 'hello-world':
        console.log(data.type)
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

    worker.postMessage({
      type: 'application',
      options: {
        view,
        background: '#1099bb',
      },
    }, [view])

    worker.onmessage = onMessage

    if (process.env.NODE_ENV === 'development') {
      (globalThis as any).__PIXI_STAGE__ = canvas.value
    }
  })
</script>