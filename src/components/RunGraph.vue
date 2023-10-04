<template>
  <div ref="stage" />
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, onMounted, ref } from 'vue'
  import { useRunGraphDomain } from '@/compositions/useRunGraphDomain'
  import { RunGraphConfig } from '@/models/RunGraph'
  import { start, stop } from '@/objects'
  import { WorkerMessage, worker } from '@/workers/runGraph'

  const props = defineProps<{
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

  useRunGraphDomain(() => props.config.runId, props.config.fetch)

  onMounted(() => {
    if (!stage.value) {
      throw new Error('Stage does not exist')
    }

    start({
      stage: stage.value,
      config: () => props.config,
    })
  })

  onBeforeUnmount(() => {
    stop()
  })
</script>