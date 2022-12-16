<template>
  <div ref="stage" class="prefect-dag" />
</template>

<script lang="ts" setup>
  import { Viewport } from 'pixi-viewport'
  import {
    Application,
    BitmapText,
    Container,
    Graphics
  } from 'pixi.js'
  import { onMounted, onBeforeUnmount, ref, watchEffect } from 'vue'
  import {
    GraphNode,
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
    graphData: GraphNode[],
  }>()

  const stage = ref<HTMLDivElement>()
  const devicePixelRatio = window.devicePixelRatio || 2

  const styles = {
    defaultViewportPadding: 40,
  }

  let loading = ref(true)
  let pixiApp: Application
  let viewport: Viewport
  let textStyles: TextStyles

  let minimumStartDate: Date
  let maximumEndDate: Date
  let overallTimeSpan: number
  let overallGraphWidth: number

  const timelineGuidesContainer = new Container()

  let nodesContainer: Container
  type NodeRecord = {
    node: Container,
    endTime: Date | null,
    stateName: string | undefined,
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
          dateScale,
          xScale,
          textStyles,
        })
        initContent()
        loading.value = false
      })
  })

  onBeforeUnmount(() => {
    pixiApp.destroy(true)
  })

  function initTimeScale(): void {
    const minimumTimeSpan = 1000 * 60

    const dates = Array
      .from(props.graphData)
      .filter(node => node.startTime && node.endTime)
      .flatMap(({
        startTime,
        endTime,
      }) => ({
        startTime,
        endTime,
      }))

    const { min, max } = getDateBounds(dates)

    minimumStartDate = min
    maximumEndDate = max

    const timeSpan = maximumEndDate.getTime() - minimumStartDate.getTime()
    overallTimeSpan = timeSpan < minimumTimeSpan ? minimumTimeSpan : timeSpan

    // @TODO: overallGraphWidth determine the overall width of the chart for layout purposes.
    //        Since our total time scale is unknown, determine a method for choosing a
    //        nice looking width of the graph.
    overallGraphWidth = stage.value?.clientWidth ? stage.value.clientWidth * 2 : 2000
  }

  function initTimelineGuidesContainer(): void {
    pixiApp.stage.addChild(timelineGuidesContainer)
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
            nodes[nodeData.id].endTime !== nodeData.endTime
            || nodes[nodeData.id].stateName !== nodeData.state?.name
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
        }
      })
    }
  })

  const stateColors: Record<string, number> = {
    'Completed': 0x00a63d,
    'Running': 0x00a8ef,
    'Scheduled': 0x60758d,
    'Pending': 0x60758d,
    'Failed': 0xf00011,
    'Cancelled': 0xf00011,
    'Crashed': 0xf00011,
    'Paused': 0xf4b000,
  }
  const nodeStyles = {
    padding: 16,
    gap: 4,
  }
  function createNode(nodeData: GraphNode, layerPlacement: number): Record<string, Container> {
    const nodeContainer = new Container()
    const label = createNodeLabel(nodeData)
    const box = new Graphics()
    drawNodeBox({
      box,
      state: nodeData.state,
      startTime: nodeData.startTime,
      endTime: nodeData.endTime,
      height: label.height,
    })

    nodeContainer.addChild(box)
    nodeContainer.addChild(label)
    nodeContainer.position.set(
      nodeData.startTime ? xScale(nodeData.startTime) : 0,
      layerPlacement * 120,
    )

    nodes[nodeData.id] = {
      node: nodeContainer,
      endTime: nodeData.endTime,
      stateName: nodeData.state?.name,
    }

    return {
      nodeContainer,
    }
  }

  function getNodeWidth(startTime?: Date | null, endTime?: Date | null): number {
    return startTime && endTime ? xScale(endTime) - xScale(startTime) : 4
  }

  function createNodeLabel(nodeData: GraphNode): BitmapText {
    const width = getNodeWidth(nodeData.startTime, nodeData.endTime)
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
    startTime: Date | null,
    endTime: Date | null,
    height: number,
  }
  function drawNodeBox({
    box,
    state,
    startTime,
    endTime,
    height,
  }: DrawNodeBoxProps): void {
    const stateFill = state?.name ? stateColors[state.name] : 0x9aa3b0

    box.beginFill(stateFill)
    box.drawRoundedRect(
      0,
      0,
      getNodeWidth(startTime, endTime),
      height + nodeStyles.padding * 2,
      12,
    )
    box.endFill()
  }

  function updateNode(nodeData: GraphNode): void {
    const node = nodes[nodeData.id]
    const box = node.node.children[0] as Graphics
    let label = node.node.children[1] as BitmapText
    box.clear()
    drawNodeBox({
      box,
      state: nodeData.state,
      startTime: nodeData.startTime,
      endTime: nodeData.endTime,
      height: label.height,
    })
  }

  // Convert a date to an X position
  function xScale(date: Date): number {
    return Math.ceil((date.getTime() - minimumStartDate.getTime()) * (overallGraphWidth / overallTimeSpan))
  }

  // Convert an X position to a timestamp
  function dateScale(xPosition: number): number {
    return Math.ceil(minimumStartDate.getTime() + xPosition * (overallTimeSpan / overallGraphWidth))
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
