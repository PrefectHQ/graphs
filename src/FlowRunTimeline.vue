<template>
  <div ref="stage" class="prefect-dag" />
</template>

<script lang="ts" setup>
  import { Cull } from '@pixi-essentials/cull'
  import { Viewport } from 'pixi-viewport'
  import {
    Application,
    BitmapText,
    Container,
    Graphics
  } from 'pixi.js'
  import { onMounted, onBeforeUnmount, ref, watchEffect, computed } from 'vue'
  import {
    TimelineNodeData,
    TextStyles,
    State
  } from './models'
  import {
    initBitmapFonts,
    initPixiApp,
    initViewport,
    initTimelineGuides
  } from './pixiFunctions'
  import { getDateBounds } from './utilities'

  const props = defineProps<{
    graphData: TimelineNodeData[],
    isRunning?: boolean,
  }>()

  const stage = ref<HTMLDivElement>()
  const devicePixelRatio = window.devicePixelRatio || 2

  const styles = {
    defaultViewportPadding: 40,
    playheadBg: 0x4E82FE,
    playheadWidth: 2,
    playheadGlowPadding: 8,
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
    node: Container,
    end: Date | null,
    state: State,
  }
  let nodes: Record<string, NodeRecord> = {}

  onMounted(() => {
    if (!stage.value) {
      console.error('Stage reference not found in initPixiApp')
      return
    }
    initTimeScale()
    pixiApp = initPixiApp(stage.value)
    // init guides before viewport for proper z-indexing
    initTimelineGuidesContainer()
    viewport = initViewport(stage.value, pixiApp)

    initBitmapFonts(devicePixelRatio)
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
        initContent()
        initPlayhead()
        initCulling()
        loading.value = false
      })
  })

  onBeforeUnmount(() => {
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
      nodesContainer.height,
    )
    playhead.endFill()
    playhead.beginFill(styles.playheadBg)
    playhead.drawRect(
      styles.playheadGlowPadding,
      0,
      styles.playheadWidth,
      nodesContainer.height,
    )
    playhead.endFill()

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
  }

  function createNodes(): Container {
    const nodesContainer = new Container()

    props.graphData.forEach((node, nodeIndex) => {
      const { nodeContainer } = createNode(node, nodeIndex)

      nodesContainer.addChild(nodeContainer)
    })

    viewport.addChild(nodesContainer)

    return nodesContainer
  }

  watchEffect(() => {
    // @TODO: This accommodates updated nodeData or newly added nodes, but not totally new data or nodes being removed.
    //        Do we even need to handle these scenarios?
    if (!loading.value) {
      props.graphData.forEach((nodeData) => {
        if (nodeData.id in nodes) {
          if (
            nodes[nodeData.id].end !== nodeData.end
            || nodes[nodeData.id].state !== nodeData.state
          ) {
            updateNode(nodeData)
          }
        } else {
          // add new node
          const { nodeContainer } = createNode(
            nodeData,
            Object.keys(nodes).length - 1,
          )
          nodesContainer.addChild(nodeContainer)

          checkDeletedNodes()

          cullDirty = true
        }
      })
    }
  })

  function checkDeletedNodes(): void {
    const nodeIds = props.graphData.map(node => node.id)
    Object.keys(nodes).forEach((nodeId) => {
      if (!nodeIds.includes(nodeId)) {
        nodes[nodeId].node.destroy()
        delete nodes[nodeId]
      }
    })
  }

  const stateColors: Record<string, number> = {
    'completed': 0x00a63d,
    'running': 0x00a8ef,
    'scheduled': 0x60758d,
    'pending': 0x60758d,
    'failed': 0xf00011,
    'cancelled': 0xf00011,
    'crashed': 0xf00011,
    'paused': 0xf4b000,
  }
  const nodeStyles = {
    padding: 16,
    gap: 4,
  }
  function createNode(nodeData: TimelineNodeData, layerPlacement: number): Record<string, Container> {
    const nodeContainer = new Container()
    const label = createNodeLabel(nodeData)
    const box = new Graphics()

    drawNodeBox({
      box,
      state: nodeData.state,
      start: nodeData.start,
      end: nodeData.end ?? new Date(),
      height: label.height,
    })

    nodeContainer.addChild(box)
    nodeContainer.addChild(label)
    nodeContainer.position.set(
      xScale(nodeData.start),
      layerPlacement * 120,
    )

    nodes[nodeData.id] = {
      node: nodeContainer,
      end: nodeData.end,
      state: nodeData.state,
    }

    if (props.isRunning) {
      pixiApp.ticker.add(() => {
        if (props.isRunning) {
          updateNode(nodeData)
        }
      })
    }

    return {
      nodeContainer,
    }
  }

  function getNodeWidth(start?: Date | null, end?: Date | null): number {
    return start && end ? xScale(end) - xScale(start) : 4
  }

  function createNodeLabel(nodeData: TimelineNodeData): BitmapText {
    const width = getNodeWidth(nodeData.start, nodeData.end)
    let isLabelInBox = true

    let label = new BitmapText(nodeData.label, textStyles.nodeTextInverse)
    if (label.width >= width) {
      isLabelInBox = false
      label.destroy()
      label = new BitmapText(nodeData.label, textStyles.nodeTextDefault)
    }

    label.position.set(
      isLabelInBox ? nodeStyles.padding : width + nodeStyles.gap,
      nodeStyles.padding,
    )

    return label
  }

  type DrawNodeBoxProps = {
    box: Graphics,
    state: State | null,
    start: Date | null,
    end: Date | null,
    height: number,
  }
  function drawNodeBox({
    box,
    state,
    start,
    end,
    height,
  }: DrawNodeBoxProps): void {
    const stateFill = state ? stateColors[state] : 0x9aa3b0

    box.beginFill(stateFill)
    box.drawRoundedRect(
      0,
      0,
      getNodeWidth(start, end),
      height + nodeStyles.padding * 2,
      12,
    )
    box.endFill()
  }

  function updateNode(nodeData: TimelineNodeData): void {
    const node = nodes[nodeData.id]
    const box = node.node.children[0] as Graphics
    let label = node.node.children[1] as BitmapText
    box.clear()
    drawNodeBox({
      box,
      state: nodeData.state,
      start: nodeData.start,
      end: nodeData.end ?? new Date(),
      height: label.height,
    })
    node.node.position.x = xScale(nodeData.start)
    node.end = nodeData.end
    node.state = nodeData.state
  }

  // Convert a date to an X position
  function xScale(date: Date): number {
    return Math.ceil((date.getTime() - minimumStartDate.getTime()) * (overallGraphWidth / overallTimeSpan.value))
  }

  // Convert an X position to a timestamp
  function dateScale(xPosition: number): number {
    return Math.ceil(minimumStartDate.getTime() + xPosition * (overallTimeSpan.value / overallGraphWidth))
  }
</script>

<style>
.prefect-dag { @apply
  bg-slate-100
  rounded-lg
  shadow-md
  w-full
  h-full
  overflow-hidden
  relative
}
.prefect-dag canvas { @apply
  absolute
  top-0
  left-0
  w-full
  h-full
}
</style>
