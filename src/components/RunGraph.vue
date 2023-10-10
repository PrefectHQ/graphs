<template>
  <div ref="stage" />
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, onMounted, ref } from 'vue'
  import { RunGraphConfig } from '@/models/RunGraph'
  import { ScaleXDomain, start, stop } from '@/objects'
  import { emitter } from '@/objects/events'

  const props = defineProps<{
    config: RunGraphConfig,
    visibleDateRange?: ScaleXDomain,
  }>()

  const emit = defineEmits<{
    (event: 'update:visibleDateRange', value: ScaleXDomain): void,
  }>()

  const stage = ref<HTMLDivElement>()

  emitter.on('viewportDateRangeUpdated', range => emit('update:visibleDateRange', range))
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
      config: () => props.config,
      visibleDateRange: () => props.visibleDateRange,
    })
  })

  onBeforeUnmount(() => {
    stop()
  })
</script>