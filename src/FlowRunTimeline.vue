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
    onUnmounted,
    ref,
    watch
  } from 'vue'
  import { Guides } from '@/containers/guides'
  import {
    GraphTimelineNode,
    nodeThemeFnDefault,
    TimelineThemeOptions,
    FormatDateFns,
    formatDateFnsDefault,
    TimelineScale,
    TimelineNodesLayoutOptions,
    CenterViewportOptions,
    ExpandedSubNodes,
    InitTimelineScaleProps,
    GraphState,
    NodeSelectionEvent,
    TimelineVisibleDateRange
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
    nodeClickEvents
  } from '@/pixiFunctions'
  import {
    getDateBounds,
    parseThemeOptions
  } from '@/utilities'

  // at which point the data is too large to animate smoothly
  const animationThreshold = 500

  const props = defineProps<{
    graphData: GraphTimelineNode[],
    isRunning?: boolean,
    theme?: TimelineThemeOptions,
    formatDateFns?: Partial<FormatDateFns>,
    selectedNodeId?: string | null,
    layout?: TimelineNodesLayoutOptions,
    hideEdges?: boolean,
    subNodeLabels?: Map<string, string>,
    expandedSubNodes?: ExpandedSubNodes,
    visibleDateRange?: TimelineVisibleDateRange,
  }>()

  const emit = defineEmits<{
    (event: 'selection', value: NodeSelectionEvent | null): void,
    (event: 'subNodeToggle', value: string): void,
    (event: 'update:visibleDateRange', value: TimelineVisibleDateRange | undefined): void,
  }>()

  defineExpose({
    centerViewport,
    moveViewportCenter,
  })

  const internalVisibleDateRange = computed<TimelineVisibleDateRange | undefined>({
    get() {
      return props.visibleDateRange
    },
    set(value) {
      emit('update:visibleDateRange', value)
    },
  })

  const stage = ref<HTMLDivElement>()
  const styleNode = computed(() => props.theme?.node ?? nodeThemeFnDefault)
  const styleOptions = computed(() => parseThemeOptions(props.theme?.defaults))
  const selectedNodeId = computed(() => props.selectedNodeId ?? null)
  const layoutSetting = computed(() => props.layout ?? 'nearestParent')
  const isRunning = computed(() => props.isRunning ?? false)
  const hideEdges = computed(() => props.hideEdges ?? false)
  const subNodeLabels = computed(() => props.subNodeLabels ?? new Map())
  const expandedSubNodes = computed(() => props.expandedSubNodes ?? new Map())
  const suppressMotion = computed(() => {
    const prefersReducedMotion: boolean = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return props.graphData.length > animationThreshold || prefersReducedMotion
  })
  const isViewportDragging = ref(false)
  const formatDateFns = computed(() => ({
    ...formatDateFnsDefault,
    ...props.formatDateFns,
  }))

  const loading = ref(true)
  let pixiApp: Application
  let viewport: Viewport
  const cull = new Cull()

  let timeScaleProps: InitTimelineScaleProps
  let minimumStartDate: Date
  const maximumEndDate = ref<Date | undefined>()
  let initialOverallTimeSpan: number
  let graphXDomain: number
  let timelineScale: TimelineScale

  let guides: TimelineGuides
  let playhead: TimelinePlayhead | undefined
  let playheadTicker: (() => void) | null = null
  const nodesContentContainerName = 'rootNodesContainer'
  let nodesContainer: TimelineNodes

  let graphState: GraphState | null = null

  onMounted(async () => {
    if (!stage.value) {
      console.error('Stage reference not found in initPixiApp')
      return
    }
    initTimeScaleProps()
    timelineScale = initTimelineScale(timeScaleProps)

    pixiApp = initPixiApp(stage.value)
    pixiApp.stage.sortableChildren = true

    viewport = await initViewport(stage.value, pixiApp)
    initViewportDragMonitor()
    initDateRangeModel()

    initFonts()
    initGraphState()

    initGuides()
    initContent()
    initPlayhead()
    initNewGuides()

    initCulling()

    loading.value = false
  })

  function initNewGuides(): void {
    const guides = new Guides({ application: pixiApp, viewport, styles: styleOptions.value, formatters: formatDateFns.value })

    pixiApp.stage.addChild(guides)
  }

  onUnmounted(() => {
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

  function updateInternalVisibleDateRange(): void {
    internalVisibleDateRange.value = {
      startDate: timelineScale.xToDate(viewport.left),
      endDate: timelineScale.xToDate(viewport.right),
      internalOrigin: true,
    }
  }

  function initDateRangeModel(): void {
    // Fires continuously as the viewport is moved
    viewport.on('moved', () => {
      updateInternalVisibleDateRange()
    })
    viewport.on('resize', () => {
      updateInternalVisibleDateRange()
    })
    watch(() => props.visibleDateRange, () => {
      if (!internalVisibleDateRange.value) {
        return
      }

      if (internalVisibleDateRange.value.internalOrigin) {
        internalVisibleDateRange.value.internalOrigin = false
        return
      }

      const newViewportLeft = timelineScale.dateToX(internalVisibleDateRange.value.startDate)
      const newViewportRight = timelineScale.dateToX(internalVisibleDateRange.value.endDate)
      const centerX = newViewportLeft + (newViewportRight - newViewportLeft) / 2

      viewport.fitWidth(newViewportRight - newViewportLeft, true)
      viewport.moveCenter(centerX, viewport.center.y)
    }, { deep: true })
  }

  function initTimeScaleProps(): void {
    const minimumTimeSpan = 1000 * 60
    const { min: minDate, max: maxDate, span } = getDateBounds(props.graphData, minimumTimeSpan, isRunning.value)

    minimumStartDate = minDate
    maximumEndDate.value = maxDate
    initialOverallTimeSpan = span

    graphXDomain = determineGraphXDomain()

    timeScaleProps = {
      minimumStartTime: minimumStartDate.getTime(),
      graphXDomain,
      initialOverallTimeSpan,
    }
  }

  function determineGraphXDomain(): number {
    const {
      spacingNodeYPadding,
      textLineHeightDefault,
      spacingNodeMargin,
      spacingSubNodesOutlineOffset,
    } = styleOptions.value

    const dataSize = props.graphData.length

    // this nodeHeight measurement is apx because, while it attempts to match the actual node height,
    // we're not measuring an actual node here. e.g. the outlineOffset may not be adding to the
    // height twice when collapsed. but it's close enough for our purposes.
    const apxNodeHeight =
      textLineHeightDefault
      + spacingNodeYPadding * 2
      + spacingSubNodesOutlineOffset * 2
      + spacingNodeMargin
    const aspectRatio = stage.value!.clientWidth / stage.value!.clientHeight
    const apxNodesHeight = apxNodeHeight * dataSize
    const apxNodesWidth = apxNodesHeight * aspectRatio
    const multiple = dataSize >= 120 ? dataSize / 100 : 1.2

    return apxNodesWidth * multiple
  }

  function initFonts(): void {
    initBitmapFonts(styleOptions.value)

    watch(styleOptions, (newValue) => {
      updateBitmapFonts(newValue)
    })
  }

  function initGraphState(): void {
    graphState = {
      pixiApp,
      viewport,
      cull,
      cullScreen,
      timeScaleProps,
      styleOptions,
      styleNode,
      layoutSetting,
      isRunning,
      hideEdges,
      subNodeLabels,
      selectedNodeId,
      expandedSubNodes,
      suppressMotion,
      centerViewport,
    }
  }

  function initPlayhead(): void {
    if (!isRunning.value) {
      return
    }

    playhead = new TimelinePlayhead({
      pixiApp,
      viewport,
      cull,
      formatDateFns,
      styleOptions,
    })

    pixiApp.stage.addChild(playhead)

    initPlayheadTicker()
  }

  function initPlayheadTicker(): void {
    if (playheadTicker || !playhead) {
      return
    }

    playheadTicker = () => {
      if (isRunning.value && playhead && !playhead.destroyed) {
        const playheadStartedVisible = playhead.position.x > 0 && playhead.position.x < pixiApp.screen.width
        maximumEndDate.value = new Date()
        playhead.updatePosition()

        if (
          !viewport.moving
          && playheadStartedVisible
          && playhead.position.x > pixiApp.screen.width - styleOptions.value.spacingViewportPaddingDefault
        ) {
          const originalLeft = timelineScale.xToDate(viewport.left)
          viewport.zoomPercent(-0.1, true)
          viewport.left = timelineScale.dateToX(originalLeft)
        }
      }
    }

    pixiApp.ticker.add(playheadTicker)
  }

  watch(isRunning, running => {
    if (loading.value) {
      return
    }

    if (playhead && playheadTicker) {
      playhead.destroy()
      pixiApp.ticker.remove(playheadTicker)
      playheadTicker = null
    }

    if (running) {
      initPlayhead()
    }
  })

  function initGuides(): void {
    if (!graphState) {
      return
    }

    guides = new TimelineGuides({
      graphState,
      maximumEndDate,
      formatDateFns,
    })

    pixiApp.stage.addChild(guides)

    pixiApp.ticker.add(() => {
      guides.updateGuides()
    })
  }

  function initCulling(): void {
    viewport.on('frame-end', () => {
      if (viewport.dirty) {
        cullScreen()

        viewport.dirty = false
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
    cullScreen()
  }
  function cullScreen(): void {
    cull.cull(pixiApp.renderer.screen)
  }

  function initContent(): void {
    if (!graphState) {
      return
    }

    nodesContainer = new TimelineNodes({
      nodeContentContainerName: nodesContentContainerName,
      graphData: props.graphData,
      graphState,
    })
    viewport.addChild(nodesContainer)

    nodesContainer.on(nodeClickEvents.nodeDetails, (nodeSelectionValue) => {
      if (!isViewportDragging.value) {
        emit('selection', nodeSelectionValue)
      }
    })
    nodesContainer.on(nodeClickEvents.subNodesToggle, (subNodesId) => {
      if (!isViewportDragging.value) {
        emit('subNodeToggle', subNodesId)
      }
    })

    watch(() => props.graphData, () => {
      // This accommodates updated nodeData or newly added nodes.
      // If totally new data is added, it all gets appended way down the viewport Y axis.
      // If nodes are deleted, they are not removed from the viewport (shouldn't happen).
      nodesContainer.update(props.graphData)
      viewport.dirty = true
    })
  }

  function centerViewport({ skipAnimation }: CenterViewportOptions = {}): void {
    const { spacingViewportPaddingDefault } = styleOptions.value
    const defaultAnimationDuration = 500

    pauseCulling()
    const {
      x: contentX,
      y: contentY,
      width,
      height,
    } = nodesContainer.getChildByName(nodesContentContainerName).getLocalBounds()
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
      time: skipAnimation || suppressMotion.value ? 0 : defaultAnimationDuration,
      ease: 'easeInOutQuad',
      removeOnInterrupt: true,
      callbackOnComplete: () => {
        // instant animations fail to cause the 'move' event to fire
        // so here we manually update visible interval
        if (skipAnimation) {
          updateInternalVisibleDateRange()
        }
      },
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
