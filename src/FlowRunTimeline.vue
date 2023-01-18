<template>
  <div
    ref="stage"
    class="flow-run-timeline"
  />
</template>

<script lang="ts" setup>
  import { Cull } from '@pixi-essentials/cull'
  import type { Viewport } from 'pixi-viewport'
  import {
    Application,
    Ticker
  } from 'pixi.js'
  import { computed, onMounted, onBeforeUnmount, ref, watchEffect } from 'vue'
  import {
    TimelineNodeData,
    nodeThemeFnDefault,
    TimelineThemeOptions,
    FormatDateFns,
    formatDateFnsDefault,
    XScale,
    DateScale
  } from './models'
  import {
    initPixiApp,
    initViewport,
    TimelineGuides,
    TimelineNodes,
    TimelinePlayhead
  } from './pixiFunctions'
  import { getDateBounds, parseThemeOptions } from './utilities'

  const props = defineProps<{
    graphData: TimelineNodeData[],
    isRunning?: boolean,
    theme?: TimelineThemeOptions,
    formatDateFns?: Partial<FormatDateFns>,
  }>()

  const stage = ref<HTMLDivElement>()

  const styleNode = computed(() => props.theme?.node ?? nodeThemeFnDefault)

  const styles = computed(() => parseThemeOptions(props.theme?.defaults))

  const formatDateFns = computed(() => ({
    ...formatDateFnsDefault,
    ...props.formatDateFns,
  }))

  const zIndex = {
    timelineGuides: 0,
    viewport: 10,
    playhead: 20,
  }

  let loading = ref(true)
  let pixiApp: Application
  let viewport: Viewport
  let cull = new Cull()
  // flag cullDirty when new nodes are added to the viewport after init
  let cullDirty = false

  let minimumStartDate: Date
  let maximumEndDate = ref<Date | undefined>()
  let initialOverallTimeSpan: number
  let overallGraphWidth: number

  let guides: TimelineGuides
  let playhead: TimelinePlayhead | undefined
  let playheadTicker: Ticker | null = null

  let nodes: TimelineNodes

  const emit = defineEmits<{
    (event: 'click', value: any): void,
  }>()

  onMounted(async () => {
    if (!stage.value) {
      console.error('Stage reference not found in initPixiApp')
      return
    }
    initTimeScale()

    pixiApp = initPixiApp(stage.value)
    pixiApp.stage.sortableChildren = true

    viewport = await initViewport(stage.value, pixiApp)
    viewport.zIndex = zIndex.viewport

    initGuides()
    initContent()
    initPlayhead()

    initCulling()

    loading.value = false
  })

  onBeforeUnmount(() => {
    cleanupApp()
  })

  function cleanupApp(): void {
    guides.destroy()
    playhead?.destroy()
    nodes.destroy()

    pixiApp.destroy(true)
  }

  function initTimeScale(): void {
    const minimumTimeSpan = 1000 * 60

    const dates = props.graphData.filter(node => node.end).map(({ start, end }) => ({ start, end }))

    if (props.isRunning === true) {
      dates.push({
        start: new Date(),
        end: new Date(),
      })
    }

    const { min, max, span } = getDateBounds(dates, minimumTimeSpan)

    minimumStartDate = min
    maximumEndDate.value = max
    initialOverallTimeSpan = span

    overallGraphWidth = stage.value!.clientWidth * 2
  }

  function initPlayhead(): void {
    if (!props.isRunning) {
      return
    }

    playhead = new TimelinePlayhead({
      viewportRef: viewport,
      appRef: pixiApp,
      xScale,
      styles,
    })
    playhead.zIndex = zIndex.playhead

    pixiApp.stage.addChild(playhead)

    initPlayheadTicker()
  }

  function initPlayheadTicker(): void {
    if (playheadTicker) {
      return
    }

    playheadTicker = pixiApp.ticker.add(() => {
      if (props.isRunning && playhead) {
        const playheadStartedVisible = playhead.position.x > 0 && playhead.position.x < pixiApp.screen.width
        maximumEndDate.value = new Date()
        playhead.updatePosition()

        if (
          !viewport.moving
          && playheadStartedVisible
          && playhead.position.x > pixiApp.screen.width - styles.value.spacingViewportPaddingDefault
        ) {
          const originalLeft = dateScale(viewport.left)
          viewport.zoomPercent(-0.1, true)
          viewport.left = xScale(new Date(originalLeft))
        }
      } else if (!playhead?.destroyed) {
        playhead?.destroy()
      }
    })
  }

  function initGuides(): void {
    guides = new TimelineGuides({
      viewportRef: viewport,
      appRef: pixiApp,
      xScale,
      dateScale,
      minimumStartDate,
      maximumEndDate,
      isRunning: props.isRunning ?? false,
      styles,
      formatDateFns,
    })

    guides.zIndex = zIndex.timelineGuides

    pixiApp.stage.addChild(guides)

    pixiApp.ticker.add(() => {
      guides.updateGuides()
    })
  }

  function initCulling(): void {
    cull.addAll(viewport.children)

    viewport.on('frame-end', () => {
      if (viewport.dirty || cullDirty) {
        cull.cull(pixiApp.renderer.screen)

        viewport.dirty = false
        cullDirty = false
      }
    })
  }

  function initContent(): void {
    nodes = new TimelineNodes({
      graphData: props.graphData,
      xScale,
      styles,
      styleNode,
    })
    viewport.addChild(nodes)

    centerViewportOnNodes()

    if (props.isRunning) {
      pixiApp.ticker.add(() => {
        if (props.isRunning) {
          nodes.update()
        }
      })
    }

    nodes.children.forEach((node: any) => {
      node.on('pointerdown', () => {
        emit('click', node.nodeData.id)
      })
    })
  }

  function centerViewportOnNodes(): void {
    const { spacingViewportPaddingDefault } = styles.value
    const {
      x: nodesX,
      y: nodesY,
      width: nodesWidth,
      height: nodesHeight,
    } = nodes

    viewport.ensureVisible(
      nodesX - spacingViewportPaddingDefault,
      nodesY - spacingViewportPaddingDefault,
      nodesWidth + spacingViewportPaddingDefault * 2,
      nodesHeight + spacingViewportPaddingDefault * 2,
      true,
    )
    viewport.moveCenter(
      nodesX + nodesWidth / 2,
      nodesY + nodesHeight / 2,
    )
  }

  watchEffect(() => {
    // This accommodates updated nodeData or newly added nodes.
    // If totally new data is added, it all gets appended way down the viewport Y axis.
    // If nodes are deleted, they are not removed from the viewport (shouldn't happen).
    if (!loading.value) {
      nodes.update(props.graphData)
      cullDirty = true

      if (props.isRunning && (!playhead || playhead.destroyed)) {
        initPlayhead()
      }
    }
  })

  // Convert a date to an X position
  const xScale: XScale = (date) => {
    return Math.ceil((date.getTime() - minimumStartDate.getTime()) * (overallGraphWidth / initialOverallTimeSpan))
  }

  // Convert an X position to a timestamp
  const dateScale: DateScale = (xPosition) => {
    return Math.ceil(minimumStartDate.getTime() + xPosition * (initialOverallTimeSpan / overallGraphWidth))
  }
</script>

<style>
.flow-run-timeline { @apply
  w-full
  h-full
  overflow-hidden
  relative
}

.flow-run-timeline canvas { @apply
  absolute
  top-0
  left-0
  w-full
  h-full
}
</style>
