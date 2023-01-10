<template>
  <div ref="stage" class="flow-run-timeline" />
</template>

<script lang="ts" setup>
  import { Cull } from '@pixi-essentials/cull'
  import type { Viewport } from 'pixi-viewport'
  import {
    Application,
    Container
  } from 'pixi.js'
  import { onMounted, onBeforeUnmount, ref, watchEffect } from 'vue'
  import {
    TimelineNodeData,
    TimelineNodeState
  } from './models'
  import {
    initPixiApp,
    initViewport,
    TimelineGuides,
    TimelineNode,
    TimelinePlayhead
  } from './pixiFunctions'
  import { getDateBounds } from './utilities'

  const props = defineProps<{
    graphData: TimelineNodeData[],
    isRunning?: boolean,
    formatTimeBySeconds: (date: Date) => string,
    formatTimeByMinutes: (date: Date) => string,
    formatDate: (date: Date) => string,
  }>()

  const stage = ref<HTMLDivElement>()

  const routeParams = {
    accountId: '9a67b081-4f14-4035-b000-1f715f46231b',
    workspaceId:'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
  }

  const styles = {
    defaultViewportPadding: 40,
  }

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

  const minimumTimeSpan = 1000 * 60
  let minimumStartDate: Date
  let maximumEndDate = ref<Date | undefined>()
  let initialOverallTimeSpan: number
  let overallGraphWidth: number

  let guides: TimelineGuides
  let playhead: TimelinePlayhead | undefined

  let nodesContainer = new Container()
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

    nodesContainer.removeChildren()
    nodes.clear()
    nodesContainer.destroy()

    pixiApp.destroy(true)
  }

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
    const timeSpan = max.getTime() - min.getTime()

    minimumStartDate = min
    maximumEndDate.value = max
    initialOverallTimeSpan = timeSpan < minimumTimeSpan ? minimumTimeSpan : timeSpan
    overallGraphWidth = stage.value?.clientWidth ? stage.value.clientWidth * 2 : 2000
  }

  function initPlayhead(): void {
    if (!props.isRunning) {
      return
    }

    playhead = new TimelinePlayhead({
      viewportRef: viewport,
      appRef: pixiApp,
      xScale,
    })
    playhead.zIndex = zIndex.playhead

    pixiApp.stage.addChild(playhead)

    // If isRunning is turned off, then back on again, this will not reinitialize
    pixiApp.ticker.add(() => {
      if (props.isRunning && playhead) {
        const playheadStartedVisible = playhead.position.x > 0 && playhead.position.x < pixiApp.screen.width
        maximumEndDate.value = new Date()
        playhead.updatePosition()

        if (
          !viewport.moving
          && playheadStartedVisible
          && playhead.position.x > pixiApp.screen.width - styles.defaultViewportPadding
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
      formatTimeBySeconds: props.formatTimeBySeconds,
      formatTimeByMinutes: props.formatTimeByMinutes,
      formatDate: props.formatDate,
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
    props.graphData.forEach((nodeData, nodeIndex) => {
      const node = new TimelineNode(nodeData, xScale, nodeIndex, routeParams)

      nodes.set(nodeData.id, {
        node,
        end: nodeData.end,
        state: nodeData.state,
      })

      nodesContainer.addChild(node)
    })

    viewport.addChild(nodesContainer)
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

  watchEffect(() => {
    // This accommodates updated nodeData or newly added nodes.
    // If totally new data is added, it all gets appended way down the viewport Y axis.
    // If nodes are deleted, they are not removed from the viewport (shouldn't happen).
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
          const node = new TimelineNode(nodeData, xScale, nodes.size - 1, routeParams)

          nodesContainer.addChild(node)

          cullDirty = true
        }
      })
    }
  })

  // Convert a date to an X position
  function xScale(date: Date): number {
    return Math.ceil((date.getTime() - minimumStartDate.getTime()) * (overallGraphWidth / initialOverallTimeSpan))
  }

  // Convert an X position to a timestamp
  function dateScale(xPosition: number): number {
    return Math.ceil(minimumStartDate.getTime() + xPosition * (initialOverallTimeSpan / overallGraphWidth))
  }
</script>

<style>
.flow-run-timeline { @apply
  w-full
  h-full
  bg-slate-100
  rounded-lg
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
