import {
  DEFAULT_SUBFLOW_ARTIFACT_Z_INDEX,
  DEFAULT_NESTED_GRAPH_BORDER_Z_INDEX,
  DEFAULT_SUBFLOW_EVENT_Z_INDEX,
  DEFAULT_NODE_LABEL_Z_INDEX,
  DEFAULT_NESTED_GRAPH_NODE_Z_INDEX,
  DEFAULT_NESTED_GRAPH_NODES_Z_INDEX,
  DEFAULT_SUBFLOW_STATE_Z_INDEX
} from '@/consts'
import { borderFactory } from '@/factories/border'
import { dataFactory } from '@/factories/data'
import { eventDataFactory } from '@/factories/eventData'
import { nodeLabelFactory } from '@/factories/label'
import { nodeArrowButtonFactory } from '@/factories/nodeArrowButton'
import { nodeBarFactory } from '@/factories/nodeBar'
import { nodesContainerFactory } from '@/factories/nodes'
import { runArtifactsFactory } from '@/factories/runArtifacts'
import { runEventsFactory } from '@/factories/runEvents'
import { runStatesFactory } from '@/factories/runStates'
import { RunGraphArtifact, RunGraphEvent, RunGraphStateEvent } from '@/models'
import { BoundsContainer } from '@/models/boundsContainer'
import { NodeSize } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { cull } from '@/objects/culling'
import { layout, waitForSettings } from '@/objects/settings'

export type FlowRunContainer = Awaited<ReturnType<typeof flowRunContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunContainerFactory(node: RunGraphNode) {
  const container = new BoundsContainer()
  const config = await waitForConfig()
  const settings = await waitForSettings()

  const { element: bar, render: renderBar } = await nodeBarFactory()
  const { element: label, render: renderLabelText } = await nodeLabelFactory()
  const { element: arrowButton, render: renderArrowButtonContainer } = await nodeArrowButtonFactory()
  const { element: border, render: renderBorderContainer } = await borderFactory()

  const { element: nodesContainer, render: renderNodes, getSize: getNodesSize, stopWorker: stopNodesWorker } = await nodesContainerFactory()
  const { element: nodesState, render: renderNodesState } = await runStatesFactory()
  const { element: nodesEvents, render: renderNodesEvents, update: updateNodesEvents } = await runEventsFactory({ parentStartDate: node.start_time })
  const { element: nodesArtifacts, render: renderNodesArtifacts, update: updateNodesArtifacts } = await runArtifactsFactory({ parentStartDate: node.start_time })

  let hasEvents = false
  let hasArtifacts = false

  let internalNode = node
  let isOpen = false

  container.sortableChildren = true

  border.zIndex = DEFAULT_NESTED_GRAPH_BORDER_Z_INDEX
  bar.zIndex = DEFAULT_NESTED_GRAPH_NODE_Z_INDEX
  label.zIndex = DEFAULT_NODE_LABEL_Z_INDEX
  arrowButton.zIndex = DEFAULT_NODE_LABEL_Z_INDEX

  nodesContainer.zIndex = DEFAULT_NESTED_GRAPH_NODES_Z_INDEX
  nodesEvents.zIndex = DEFAULT_SUBFLOW_EVENT_Z_INDEX
  nodesState.zIndex = DEFAULT_SUBFLOW_STATE_Z_INDEX
  nodesArtifacts.zIndex = DEFAULT_SUBFLOW_ARTIFACT_Z_INDEX

  border.eventMode = 'none'
  border.cursor = 'default'

  const { start: startData, stop: stopData } = await dataFactory(internalNode.id, data => {
    hasArtifacts = !!data.artifacts && data.artifacts.length > 0

    renderNodes(data)
    renderStates(data.states)
    renderArtifacts(data.artifacts)
    renderBorder()
  })

  const { start: startEventsData, stop: stopEventsData } = await eventDataFactory(() => ({
    nodeId: internalNode.id,
    since: internalNode.start_time,
    until: internalNode.end_time ?? new Date(),
  }), data => {
    hasEvents = data.length > 0

    renderEvents(data)
  })

  container.addChild(bar)
  container.addChild(label)
  container.addChild(arrowButton)

  arrowButton.on('click', event => {
    event.stopPropagation()
    toggle()
  })

  nodesContainer.position = { x: 0, y: config.styles.nodeHeight + config.styles.nodesPadding }

  nodesContainer.on('rendered', () => {
    cull()
    resized()
  })

  async function render(newNodeData: RunGraphNode): Promise<BoundsContainer> {
    internalNode = newNodeData

    await renderBar(newNodeData)
    await renderArrowButton()
    await renderLabel()

    if (isOpen) {
      await renderStates()
      await renderEvents()
      await renderArtifacts()
      await renderBorder()
    }

    return container
  }

  async function toggle(): Promise<void> {
    if (!isOpen) {
      await open()
    } else {
      await close()
    }
  }

  async function renderBorder(): Promise<void> {
    const { background = '#fff' } = config.styles.node(internalNode)
    const { width, height: nodeHeights } = getNodesSize()
    const { height: nodeLayersHeight } = getSize()
    const { nodeBorderRadius } = config.styles

    const strokeWidth = 2
    border.position = { x: -strokeWidth, y: -strokeWidth }

    const height = layout.isTemporal()
      ? nodeLayersHeight + strokeWidth * 2
      : nodeHeights + strokeWidth * 2

    await renderBorderContainer({
      width: width + strokeWidth * 2,
      height,
      stroke: strokeWidth,
      radius: [nodeBorderRadius, nodeBorderRadius, 0, 0],
      color: background,
    })
  }

  async function renderStates(data?: RunGraphStateEvent[]): Promise<void> {
    const { height } = getSize()
    const { width } = bar

    await renderNodesState(data ?? undefined, {
      parentStartDate: internalNode.start_time,
      width,
      height,
    })
  }

  async function renderEvents(data?: RunGraphEvent[]): Promise<void> {
    if (!isOpen || !layout.isTemporal() || settings.disableEvents) {
      container.removeChild(nodesEvents)
      return
    }

    container.addChild(nodesEvents)

    const { height } = getSize()

    nodesEvents.position = { x: 0, y: height - config.styles.eventBottomMargin }

    if (data) {
      await renderNodesEvents(data)
      return
    }

    await updateNodesEvents()
  }

  async function renderArtifacts(data?: RunGraphArtifact[]): Promise<void> {
    if (!isOpen || !layout.isTemporal() || settings.disableArtifacts) {
      container.removeChild(nodesArtifacts)
      return
    }

    container.addChild(nodesArtifacts)

    const { eventTargetSize, flowStateSelectedBarHeight } = config.styles
    const { height } = getSize()

    const y = height - (hasEvents && !settings.disableEvents ? eventTargetSize : flowStateSelectedBarHeight)

    nodesArtifacts.position = { x: 0, y }

    if (data) {
      await renderNodesArtifacts(data)
      return
    }

    await updateNodesArtifacts()
  }

  async function open(): Promise<void> {
    isOpen = true
    container.addChild(nodesState)
    container.addChild(nodesContainer)
    container.addChild(border)

    await Promise.all([
      startData(),
      startEventsData(),
      render(internalNode),
    ])

    resized()
  }

  async function close(): Promise<void> {
    isOpen = false
    container.removeChild(nodesState)
    container.removeChild(nodesContainer)
    container.removeChild(border)
    container.removeChild(nodesEvents)
    container.removeChild(nodesArtifacts)
    stopNodesWorker()

    await Promise.all([
      stopData(),
      stopEventsData(),
      render(internalNode),
    ])

    resized()
  }

  async function renderArrowButton(): Promise<BoundsContainer> {
    const buttonSize = config.styles.nodeToggleSize
    const offset = config.styles.nodeHeight - buttonSize
    const inside = bar.width > buttonSize

    const container = await renderArrowButtonContainer({
      inside,
      isOpen,
    })

    container.x = inside ? offset / 2 : bar.width + config.styles.nodePadding
    container.y = offset / 2

    return container
  }

  async function renderLabel(): Promise<BoundsContainer> {
    const label = await renderLabelText(internalNode.label)
    const colorOnNode = config.styles.colorMode === 'dark'
      ? config.styles.textDefault
      : config.styles.textInverse

    const padding = config.styles.nodePadding
    const rightOfButton = arrowButton.x + arrowButton.width + padding
    const rightOfBar = bar.width + padding
    const inside = bar.width > rightOfButton + label.width + padding

    const y = config.styles.nodeHeight / 2 - label.height / 2
    const x = inside ? rightOfButton : Math.max(rightOfBar, rightOfButton)

    label.position = { x, y }
    label.tint = inside ? colorOnNode : config.styles.textDefault

    return label
  }

  function resized(): void {
    if (isOpen) {
      renderStates()
      renderEvents()
      renderArtifacts()
      renderBorder()
    }

    const size = getSize()

    container.emit('resized', size)
  }

  function getSize(): NodeSize {
    const nodes = getNodesSize()
    const {
      nodeHeight,
      nodesPadding,
      eventTargetSize,
      eventBottomMargin,
      artifactPaddingY,
      artifactIconSize,
    } = config.styles

    const showArtifacts = hasArtifacts && layout.isTemporal() && !settings.disableArtifacts
    const artifactsHeight = showArtifacts ? artifactIconSize + artifactPaddingY * 2 : 0

    const showEvents = hasEvents && layout.isTemporal() && !settings.disableEvents
    const eventsHeight = showEvents ? eventTargetSize + eventBottomMargin : 0

    const nodesHeight = isOpen
      ? nodes.height + artifactsHeight + eventsHeight + nodesPadding * 2
      : 0
    const nodesWidth = isOpen ? nodes.width : 0
    const flowRunNodeHeight = nodeHeight

    return {
      height: flowRunNodeHeight + nodesHeight,
      width: Math.max(nodesWidth, container.width),
    }
  }

  return {
    kind: 'flow-run' as const,
    element: container,
    bar,
    render,
  }
}