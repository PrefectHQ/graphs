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
    Ticker,
    UPDATE_PRIORITY
  } from 'pixi.js'
  import { computed, onMounted, onBeforeUnmount, ref, watchEffect } from 'vue'
  import {
    TimelineNodeData,
    nodeThemeFnDefault,
    TimelineThemeOptions,
    FormatDateFns,
    formatDateFnsDefault,
    XScale,
    DateScale,
    NodeRecord
  } from './models'
  import {
    initBitmapFonts,
    updateBitmapFonts,
    initPixiApp,
    initViewport,
    TimelineGuides,
    TimelineNodes,
    TimelinePlayhead,
    DeselectLayer
  } from './pixiFunctions'
  import { getDateBounds, parseThemeOptions } from './utilities'

  const props = defineProps<{
    graphData: TimelineNodeData[],
    isRunning?: boolean,
    theme?: TimelineThemeOptions,
    formatDateFns?: Partial<FormatDateFns>,
    selectedNodeId?: string | null,
  }>()

  const stage = ref<HTMLDivElement>()

  const styleNode = computed(() => props.theme?.node ?? nodeThemeFnDefault)

  const styles = computed(() => parseThemeOptions(props.theme?.defaults))

  const isViewportDragging = ref(false)

  const formatDateFns = computed(() => ({
    ...formatDateFnsDefault,
    ...props.formatDateFns,
  }))

  const zIndex = {
    timelineGuides: 0,
    deselectLayer: 5,
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
  let deselectLayer: DeselectLayer
  let nodesContainer: TimelineNodes

  const emit = defineEmits<{
    (event: 'click', value: string | null): void,
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
    initViewportDragMonitor()

    initFonts()

    initGuides()
    initDeselectLayer()
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
    nodesContainer.destroy()
    deselectLayer.destroy()
    viewport.destroy()
    pixiApp.destroy(true)
  }

  function initViewportDragMonitor(): void {
    viewport
      .on('drag-start', () => {
        isViewportDragging.value = true
      }).on('drag-end', () => {
        isViewportDragging.value = false
      })
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

  function initFonts(): void {
    initBitmapFonts(styles.value)

    watchEffect(() => {
      updateBitmapFonts(styles.value)
    })
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

  function initDeselectLayer(): void {
    deselectLayer = new DeselectLayer(pixiApp)
    deselectLayer.zIndex = zIndex.deselectLayer

    pixiApp.stage.addChild(deselectLayer)

    deselectLayer.on('click', () => {
      emit('click', null)
    })

    pixiApp.ticker.add(() => {
      if (deselectLayer.width !== pixiApp.screen.width || deselectLayer.height !== pixiApp.screen.height) {
        deselectLayer.update()
      }
    }, null, UPDATE_PRIORITY.LOW)
  }

  function initContent(): void {
    nodesContainer = new TimelineNodes({
      viewportRef: viewport,
      graphData: props.graphData,
      xScale,
      styles,
      styleNode,
    })
    viewport.addChild(nodesContainer)

    centerViewportOnNodes()

    if (props.isRunning) {
      pixiApp.ticker.add(() => {
        if (props.isRunning) {
          nodesContainer.update()
        }
      })
    }

    nodesContainer.nodes.forEach((nodeRecord: NodeRecord) => {
      nodeRecord.node.on('click', () => {
        if (!isViewportDragging.value) {
          emit('click', nodeRecord.id)
        }
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
    } = nodesContainer

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

    watchEffect(() => {
      nodesContainer.updateSelection(props.selectedNodeId)
    })
  }

  watchEffect(() => {
    // This accommodates updated nodeData or newly added nodes.
    // If totally new data is added, it all gets appended way down the viewport Y axis.
    // If nodes are deleted, they are not removed from the viewport (shouldn't happen).
    if (!loading.value) {
      nodesContainer.update(props.graphData)
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
