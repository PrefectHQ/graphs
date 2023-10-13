<template>
  <div class="run-graph" :class="classes.root">
    <div ref="stage" class="run-graph__stage" />
    <div class="run-graph__actions">
      <p-button title="Recenter Timeline" icon="Target" flat @click="() => centerViewport({ animate: true })" />
      <p-button title="View Timeline in Fullscreen" icon="ArrowsPointingOutIcon" flat @click="toggleFullscreen" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import { RunGraphProps } from '@/models/RunGraph'
  import { ScaleXDomain, start, stop, centerViewport } from '@/objects'
  import { emitter } from '@/objects/events'

  // using the props object as a whole
  // eslint-disable-next-line vue/no-unused-properties
  const props = withDefaults(defineProps<RunGraphProps>(), {
    fullscreen: null,
  })

  const emit = defineEmits<{
    (event: 'update:viewport', value: ScaleXDomain): void,
    (event: 'update:fullscreen', value: boolean): void,
  }>()

  const stage = ref<HTMLDivElement>()

  const fullscreenInternal = ref(false)
  const fullscreenModel = computed({
    get() {
      return props.fullscreen ?? fullscreenInternal.value
    },
    set(value) {
      fullscreenInternal.value = value
      emit('update:fullscreen', value)
    },
  })

  const classes = computed(() => ({
    root: {
      'run-graph--fullscreen': fullscreenModel.value,
    },
  }))

  emitter.on('viewportDateRangeUpdated', range => emit('update:viewport', range))

  function toggleFullscreen(): void {
    fullscreenModel.value = !fullscreenModel.value
  }

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
.run-graph {
  position: relative;
}

.run-graph--fullscreen {
  position: fixed;
  height: 100vh !important;
  width: 100vw !important;
  left: 0;
  top: 0;
}

.run-graph__stage,
.run-graph__stage > canvas {
  width: 100%;
  height: 100%;
}

.run-graph__actions {
  position: absolute;
  bottom: 0;
  right: 0;
  padding: theme('spacing.2');
}
</style>