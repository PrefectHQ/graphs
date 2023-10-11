<template>
  <div ref="stage" class="run-graph" />
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, onMounted, ref } from 'vue'
  import { RunGraphProps } from '@/models/RunGraph'
  import { ScaleXDomain, start, stop } from '@/objects'
  import { emitter } from '@/objects/events'

  // using the props object as a whole
  // eslint-disable-next-line vue/no-unused-properties
  const props = defineProps<RunGraphProps>()

  const emit = defineEmits<{
    (event: 'update:viewport', value: ScaleXDomain): void,
  }>()

  const stage = ref<HTMLDivElement>()

  emitter.on('viewportDateRangeUpdated', range => emit('update:viewport', range))
  // emitter.on('domainUpdated', domain => emit('update:domain', domain))

  // worker.onmessage = onMessage

  // function onMessage({ data }: MessageEvent<WorkerMessage>): void {
  //   switch (data.type) {
  //     case 'pong':
  //       console.log('pong')
  //       return
  //     default:
  //       const exhaustive: never = data.type
  //       throw new Error(`data.type does not have a handler associated with it: ${exhaustive}`)
  //   }
  // }

  onMounted(() => {
    if (!stage.value) {
      throw new Error('Stage does not exist')
    }

    start({
      stage: stage.value,
      props,
    })
  })

  onBeforeUnmount(() => {
    stop()
  })
</script>

<style>
.run-graph > canvas {
  width: 100%;
  height: 100%;
}
</style>