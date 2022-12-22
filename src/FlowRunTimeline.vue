<template>
  <div class="flow-run-timeline">
    <div class="flow-run-timeline__zoom-controls">
      <p-button icon="MinusIcon" inset rounded aria-label="Zoom out" @click="zoomOut" />
      <p-button icon="PlusIcon" inset rounded aria-label="Zoom in" @click="zoomIn" />
    </div>
    <div ref="stage" class="flow-run-timeline__canvas-container" />
  </div>
</template>

<script lang="ts" setup>
  import { Cull } from '@pixi-essentials/cull'
  import type { Viewport } from 'pixi-viewport'
  import {
    Application,
    Container,
    Graphics
  } from 'pixi.js'
  import { onMounted, onBeforeUnmount, ref, watchEffect, computed } from 'vue'
  import {
    TimelineNodeData,
    TextStyles,
    TimelineNodeState
  } from './models'
  import {
    getBitmapFonts,
    initPixiApp,
    initViewport,
    initTimelineGuides,
    TimelineNode
  } from './pixiFunctions'
  import { getDateBounds } from './utilities'

  const props = defineProps<{
    graphData: TimelineNodeData[],
    isRunning?: boolean,
  }>()

  const stage = ref<HTMLDivElement>()

  const styles = {
    defaultViewportPadding: 40,
    playheadBg: 0x4E82FE,
    playheadWidth: 2,
    playheadGlowPadding: 8,
  }

  const zIndex = {
    timelineGuides: 0,
    viewport: 10,
    playhead: 20,
  }

  let loading = ref(true)
  let pixiApp: Application
  let viewport: Viewport
  let textStyles: TextStyles
  let cull = new Cull()
  // flag cullDirty when new nodes are added to the viewport after init
  let cullDirty = false

  let minimumStartDate: Date
  let maximumEndDate = ref<Date | undefined>()
  let overallGraphWidth: number

  const timelineGuidesContainer = new Container()

  let nodesContainer: Container
  type NodeRecord = {
    node: TimelineNode,
    end: Date | null,
    state: TimelineNodeState | string,
  }
  let nodes: Map<string, NodeRecord> = new Map()

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

    // init guides before viewport for proper z-indexing
    initTimelineGuidesContainer()
    timelineGuidesContainer.zIndex = zIndex.timelineGuides

    initContent()

    initPlayhead()

    getBitmapFonts()
      .then(newTextStyles => {
        textStyles = newTextStyles
        initTimelineGuides({
          app: pixiApp,
          viewport: viewport,
          stage: stage.value,
          timelineGuidesContainer,
          minimumStartDate,
          overallGraphWidth,
          isRunning: props.isRunning,
          dateScale,
          xScale,
          textStyles,
        })

        initCulling()
        loading.value = false
      })
  })

  onBeforeUnmount(() => {
    nodes.forEach(({ node }) => {
      node.destroy()
    })
    nodesContainer.destroy()
    pixiApp.destroy(true)
  })

  function initTimeScale(): void {
    const dates = Array
      .from(props.graphData)
      .filter(node => node.end)
      .flatMap(({
        start,
        end,
      }) => ({
        start,
        end,
      }))

    if (props.isRunning === true) {
      dates.push({
        start: new Date(),
        end: new Date(),
      })
    }

    const { min, max } = getDateBounds(dates)

    minimumStartDate = min
    maximumEndDate.value = max

    overallGraphWidth = stage.value?.clientWidth ? stage.value.clientWidth * 2 : 2000
  }

  const overallTimeSpan = computed(() => {
    if (!maximumEndDate.value) {
      return 0
    }
    const minimumTimeSpan = 1000 * 60
    const timeSpan = maximumEndDate.value.getTime() - minimumStartDate.getTime()
    return timeSpan < minimumTimeSpan ? minimumTimeSpan : timeSpan
  })

  function initPlayhead(): void {
    if (!props.isRunning) {
      return
    }

    const playhead = new Graphics()
    playhead.beginFill(styles.playheadBg, 0.1)
    playhead.drawRect(
      0,
      0,
      styles.playheadWidth + styles.playheadGlowPadding * 2,
      pixiApp.screen.height,
    )
    playhead.endFill()
    playhead.beginFill(styles.playheadBg)
    playhead.drawRect(
      styles.playheadGlowPadding,
      0,
      styles.playheadWidth,
      pixiApp.screen.height,
    )
    playhead.endFill()

    playhead.zIndex = zIndex.playhead

    pixiApp.stage.addChild(playhead)

    // @TODO: If isRunning is turned off, then back on again, this will not initialize
    pixiApp.ticker.add(() => {
      if (props.isRunning) {
        playhead.x = xScale(new Date()) * viewport.scale._x + viewport.worldTransform.tx - styles.playheadGlowPadding - styles.playheadWidth / 2
        maximumEndDate.value = new Date()
      } else if (!playhead.destroyed) {
        playhead.destroy()
      }
    })
  }

  function initTimelineGuidesContainer(): void {
    pixiApp.stage.addChild(timelineGuidesContainer)
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
    nodesContainer = createNodes()

    viewport.ensureVisible(
      nodesContainer.x - styles.defaultViewportPadding,
      nodesContainer.y - styles.defaultViewportPadding,
      nodesContainer.width + styles.defaultViewportPadding * 2,
      nodesContainer.height + styles.defaultViewportPadding * 2,
      true,
    )
    viewport.moveCenter(
      nodesContainer.x + nodesContainer.width / 2,
      nodesContainer.y + nodesContainer.height / 2,
    )

    if (props.isRunning) {
      pixiApp.ticker.add(() => {
        if (props.isRunning) {
          nodes.forEach(nodeItem => nodeItem.node.update())
        }
      })
    }
  }

  function createNodes(): Container {
    const nodesContainer = new Container()

    const newNodes = props.graphData.map((nodeData, nodeIndex) => {
      const node = new TimelineNode(nodeData, xScale, nodeIndex)

      nodes.set(nodeData.id, {
        node,
        end: nodeData.end,
        state: nodeData.state,
      })

      return node
    })

    nodesContainer.addChild(...newNodes)

    viewport.addChild(nodesContainer)

    return nodesContainer
  }

  watchEffect(() => {
    // @TODO: This accommodates updated nodeData or newly added nodes.
    //        If totally new data is added, it all gets appended way down the viewport Y axis.
    //        If nodes are deleted, they are not removed from the viewport (shouldn't happen).
    if (!loading.value) {
      props.graphData.forEach((nodeData) => {
        if (nodes.has(nodeData.id)) {
          const node = nodes.get(nodeData.id)!
          if (
            node.end !== nodeData.end
            || node.state !== nodeData.state
          ) {
            node.node.update()
          }
        } else {
          // add new node
          const node = new TimelineNode(nodeData, xScale, nodes.size - 1)

          nodesContainer.addChild(node)

          cullDirty = true
        }
      })
    }
  })

  // Convert a date to an X position
  function xScale(date: Date): number {
    return Math.ceil((date.getTime() - minimumStartDate.getTime()) * (overallGraphWidth / overallTimeSpan.value))
  }

  // Convert an X position to a timestamp
  function dateScale(xPosition: number): number {
    return Math.ceil(minimumStartDate.getTime() + xPosition * (overallTimeSpan.value / overallGraphWidth))
  }

  function zoomOut(): void {
    viewport.zoom(400, true)
  }

  function zoomIn(): void {
    viewport.zoom(-400, true)
  }
</script>

<style>
.flow-run-timeline { @apply
  relative
  w-full
  h-full
}

.flow-run-timeline__zoom-controls { @apply
  absolute
  flex
  gap-1
  top-4
  right-4
  z-10
}

.flow-run-timeline__canvas-container { @apply
  bg-slate-100
  rounded-lg
  w-full
  h-full
  overflow-hidden
  relative
}
.flow-run-timeline__canvas-container canvas { @apply
  absolute
  top-0
  left-0
  w-full
  h-full
}
</style>
