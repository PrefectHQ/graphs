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
    CenterViewportOptions,
    ExpandedSubNodes,
    InitTimelineScaleProps,
    GraphState
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
    graphData: TimelineNodeData[],
    isRunning?: boolean,
    theme?: TimelineThemeOptions,
    formatDateFns?: Partial<FormatDateFns>,
    selectedNodeId?: string | null,
    layout?: TimelineNodesLayoutOptions,
    hideEdges?: boolean,
    expandedSubNodes?: ExpandedSubNodes,
  }>()

  defineExpose({
    centerViewport,
    moveViewportCenter,
  })

  const stage = ref<HTMLDivElement>()
  const styleNode = computed(() => props.theme?.node ?? nodeThemeFnDefault)
  const styleOptions = computed(() => parseThemeOptions(props.theme?.defaults))
  const selectedNodeId = computed(() => props.selectedNodeId ?? null)
  const layoutSetting = computed(() => props.layout ?? 'nearestParent')
  const hideEdges = computed(() => props.hideEdges ?? false)
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

  const zIndex = {
    timelineGuides: 0,
    viewport: 10,
    playhead: 20,
  }

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

  const emit = defineEmits<{
    (event: 'selection', value: string | null): void,
    (event: 'subFlowToggle', value: string): void,
  }>()

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

  function initTimeScaleProps(): void {
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

  function initPlayhead(): void {
    if (!props.isRunning) {
      return
    }

    playhead = new TimelinePlayhead({
      viewportRef: viewport,
      appRef: pixiApp,
      cull,
      formatDateFns,
      styleOptions,
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
          && playhead.position.x > pixiApp.screen.width - styleOptions.value.spacingViewportPaddingDefault
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
      cull,
      minimumStartDate,
      maximumEndDate,
      isRunning: props.isRunning ?? false,
      styleOptions,
      formatDateFns,
    })

    guides.zIndex = zIndex.timelineGuides

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
    const graphState: GraphState = {
      pixiApp,
      viewport,
      cull,
      cullScreen,
      timeScaleProps,
      styleOptions,
      styleNode,
      layoutSetting,
      hideEdges,
      selectedNodeId,
      expandedSubNodes,
      suppressMotion,
      centerViewport,
    }

    nodesContainer = new TimelineNodes({
      nodeContentContainerName: nodesContentContainerName,
      graphData: props.graphData,
      graphState,
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
