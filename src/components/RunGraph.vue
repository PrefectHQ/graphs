<template>
  <div ref="stage" />
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, onMounted, ref } from 'vue'
  import { RunGraphConfig } from '@/models/RunGraph'
  import { start, stop } from '@/objects'
  import { RunGraphDomain } from '@/objects/domain'
  import { emitter } from '@/objects/events'
  // import { WorkerMessage, worker } from '@/workers/runGraph'

  const props = defineProps<{
    config: RunGraphConfig,
    domain?: RunGraphDomain,
  }>()

  const emit = defineEmits<{
    (event: 'update:domain', value: RunGraphDomain): void,
  }>()

  const stage = ref<HTMLDivElement>()

  emitter.on('domainCreated', domain => emit('update:domain', domain))
  emitter.on('domainUpdated', domain => emit('update:domain', domain))

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
      domain: () => props.domain,
    })
  })

  onBeforeUnmount(() => {
    stop()
  })
</script>