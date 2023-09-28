<template>
  <canvas ref="canvas" />
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue'
  import { RunGraphConfig } from '@/models/RunGraph'
  // eslint-disable-next-line import/default
  import PixiWorker from '@/workers/worker.ts?worker'

  defineProps<{
    config: RunGraphConfig,
  }>()

  const canvas = ref<HTMLCanvasElement>()

  onMounted(() => {
    if (!canvas.value) {
      throw new Error('Canvas does not exist')
    }

    const view = canvas.value.transferControlToOffscreen()
    const worker = new PixiWorker()

    // this isn't type safe
    worker.postMessage({
      view,
      background: '#1099bb',
    }, [view])

    if (process.env.NODE_ENV === 'development') {
      (globalThis as any).__PIXI_STAGE__ = canvas.value
    }
  })
</script>