<template>
  <div
    ref="stage"
    class="g-flow-run-timeline"
  />
</template>

<script lang="ts" setup>
  import { Cull } from '@pixi-essentials/cull'
  import type { Viewport } from 'pixi-viewport'
  import { Application } from 'pixi.js'
  import {
    computed,
    onMounted,
    onBeforeUnmount,
    ref,
    watch
  } from 'vue'
  import {
    TimelineNodeData,
    nodeThemeFnDefault,
    TimelineThemeOptions,
    FormatDateFns,
    formatDateFnsDefault,
    TimelineScale,
    TimelineNodesLayoutOptions,
    CenterViewportOptions
  } from '@/models'
  import {
    initBitmapFonts,
    updateBitmapFonts,
    initPixiApp,
    initViewport,
    TimelineGuides,
    TimelineNodes,
    TimelinePlayhead,
    initTimelineScale,
    nodeContainerName,
    nodeClickEvents
  } from '@/pixiFunctions'
  import {
    getDateBounds,
    parseThemeOptions
  } from '@/utilities'

  const props = defineProps<{
    graphData: TimelineNodeData[],
    isRunning?: boolean,
    theme?: TimelineThemeOptions,
    formatDateFns?: Partial<FormatDateFns>,
    selectedNodeId?: string | null,
    layout?: TimelineNodesLayoutOptions,
    hideEdges?: boolean,
  }>()

  defineExpose({
    centerViewport,
    moveViewportCenter,
  })

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
    viewport: 10,
    playhead: 20,
  }

  const loading = ref(true)
  let pixiApp: Application
  let viewport: Viewport
  const cull = new Cull()
  // flag cullDirty when new nodes are added to the viewport after init
  let cullDirty = false

  let minimumStartDate: Date
  const maximumEndDate = ref<Date | undefined>()
  let initialOverallTimeSpan: number
  let overallGraphWidth: number
  let timelineScale: TimelineScale

  let guides: TimelineGuides
  let playhead: TimelinePlayhead | undefined
  let playheadTicker: (() => void) | null = null
  let nodesContainer: TimelineNodes

  const emit = defineEmits<{
    (event: 'selection', value: string | null): void,
    (event: 'subFlowToggle', value: string): void,
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

    timelineScale = initTimelineScale({
      minimumStartTime: minimumStartDate.getTime(),
      overallGraphWidth,
      initialOverallTimeSpan,
    })
  }

  function initFonts(): void {
    initBitmapFonts(styles.value)

    watch(styles, (newValue) => {
      updateBitmapFonts(newValue)
    })
  }

  function initPlayhead(): void {
    if (!props.isRunning) {
      return
    }

    playhead = new TimelinePlayhead({
      viewportRef: viewport,
      appRef: pixiApp,
      formatDateFns,
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

    playheadTicker = () => {
      if (props.isRunning && playhead) {
        const playheadStartedVisible = playhead.position.x > 0 && playhead.position.x < pixiApp.screen.width
        maximumEndDate.value = new Date()
        playhead.updatePosition()

        if (
          !viewport.moving
          && playheadStartedVisible
          && playhead.position.x > pixiApp.screen.width - styles.value.spacingViewportPaddingDefault
        ) {
          const originalLeft = timelineScale.xToDate(viewport.left)
          viewport.zoomPercent(-0.1, true)
          viewport.left = timelineScale.dateToX(new Date(originalLeft))
        }
      } else if (!playhead?.destroyed) {
        playhead?.destroy()
      }
    }

    pixiApp.ticker.add(playheadTicker)
  }

  watch(() => props.isRunning, (newVal) => {
    if (!loading.value) {
      if (newVal && (!playhead || playhead.destroyed)) {
        initPlayhead()
      }

      if (!newVal && playhead && playheadTicker) {
        playhead.destroy()
        pixiApp.ticker.remove(playheadTicker)
        playheadTicker = null
      }
    }
  })

  function initGuides(): void {
    guides = new TimelineGuides({
      viewportRef: viewport,
      appRef: pixiApp,
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
  function pauseCulling(): void {
    /*
     * Use to pause culling when you need to calculate bounds, otherwise
     * the bounds will not account for the culled (hidden) elements.
     * Make sure to call resumeCulling() after.
     */
    cull.uncull()
  }
  function resumeCulling(): void {
    cull.cull(pixiApp.renderer.screen)
  }

  function initContent(): void {
    nodesContainer = new TimelineNodes({
      appRef: pixiApp,
      viewportRef: viewport,
      graphData: props.graphData,
      styles,
      styleNode,
      layoutSetting: props.layout ?? 'nearestParent',
      hideEdges: props.hideEdges ?? false,
      timeScaleProps: {
        minimumStartTime: minimumStartDate.getTime(),
        overallGraphWidth,
        initialOverallTimeSpan,
      },
      centerViewport,
    })
    viewport.addChild(nodesContainer)

    if (props.isRunning) {
      pixiApp.ticker.add(() => {
        if (props.isRunning) {
          nodesContainer.update()
        }
      })
    }

    nodesContainer.on(nodeClickEvents.nodeDetails, (clickedNodeId) => {
      if (!isViewportDragging.value) {
        emit('selection', clickedNodeId)
      }
    })
    nodesContainer.on(nodeClickEvents.subNodesToggle, (clickedNodeId) => {
      if (!isViewportDragging.value) {
        emit('subFlowToggle', clickedNodeId)
      }
    })

    watch(() => props.graphData, (newValue) => {
      // This accommodates updated nodeData or newly added nodes.
      // If totally new data is added, it all gets appended way down the viewport Y axis.
      // If nodes are deleted, they are not removed from the viewport (shouldn't happen).
      nodesContainer.update(newValue)
      cullDirty = true
    })
    watch(() => props.selectedNodeId, (newValue) => {
      nodesContainer.updateSelection(newValue)
    })
    watch(() => props.hideEdges, (newValue) => {
      nodesContainer.updateHideEdges(newValue ?? false)
    })
    watch(() => props.layout, (newValue) => {
      nodesContainer.updateLayoutSetting(newValue ?? 'nearestParent')
    })
  }

  function centerViewport({ skipAnimation }: CenterViewportOptions = {}): void {
    const { spacingViewportPaddingDefault } = styles.value
    const defaultAnimationDuration = 500

    pauseCulling()
    const {
      x: contentX,
      y: contentY,
      width,
      height,
    } = nodesContainer.getChildByName(nodeContainerName).getLocalBounds()
    resumeCulling()

    const scale = viewport.findFit(
      width + spacingViewportPaddingDefault * 2,
      height + spacingViewportPaddingDefault * 2,
    )

    viewport.animate({
      position: {
        x: contentX + width / 2,
        y: contentY + height / 2,
      },
      scale: scale > 1 ? 1 : scale,
      time: skipAnimation ? 0 : defaultAnimationDuration,
      ease: 'easeInOutQuad',
      removeOnInterrupt: true,
    })
  }

  type MoveViewportCenterOptions = {
    xOffset: number,
    yOffset: number,
  }
  function moveViewportCenter({ xOffset, yOffset }: MoveViewportCenterOptions): void {
    const { x: xPos, y: yPos } = viewport.transform.position
    viewport.setTransform(
      xPos + xOffset,
      yPos + yOffset,
      viewport.transform.scale.x,
      viewport.transform.scale.y,
    )
  }
</script>

<style>
.g-flow-run-timeline { @apply
  w-full
  h-full
  overflow-hidden
  relative
}

.g-flow-run-timeline canvas { @apply
  absolute
  top-0
  left-0
  w-full
  h-full
}
</style>
