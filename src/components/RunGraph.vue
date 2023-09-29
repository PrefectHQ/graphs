<template>
  <div ref="stage" />
</template>

<script lang="ts" setup>
  import { onMounted, onUnmounted, ref } from 'vue'
  import { RunGraphConfig } from '@/models/RunGraph'
  import { start, stop } from '@/objects'
  import { WorkerMessage, worker } from '@/workers/runGraph'

  defineProps<{
    config: RunGraphConfig,
  }>()

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
      throw new Error('Canvas does not exist')
    }

    start(stage.value)
  })

  onUnmounted(() => stop())
</script>