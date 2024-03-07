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
import { RunGraphFetchEventsOptions, RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { cull } from '@/objects/culling'

export type FlowRunContainer = Awaited<ReturnType<typeof flowRunContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunContainerFactory(node: RunGraphNode) {
  const container = new BoundsContainer()
  const config = await waitForConfig()

  const { element: bar, render: renderBar } = await nodeBarFactory()
  const { element: label, render: renderLabelText } = await nodeLabelFactory()
  const { element: arrowButton, render: renderArrowButtonContainer } = await nodeArrowButtonFactory()

  const { element: nodesContainer, render: renderNodes, getSize: getNodesSize, stopWorker: stopNodesWorker } = await nodesContainerFactory()
  const { element: nodesState, render: renderNodesState } = await runStatesFactory()
  const { element: nodesEvents, render: renderNodesEvents, update: updateNodesEvents } = await runEventsFactory({ parentStartDate: node.start_time })
  const { element: nodesArtifacts, render: renderNodesArtifacts, update: updateNodesArtifacts } = await runArtifactsFactory({ parentStartDate: node.start_time })

  container.sortableChildren = true
  bar.zIndex = 2
  label.zIndex = 3
  arrowButton.zIndex = 3
  nodesContainer.zIndex = 1
  nodesState.zIndex = 1
  nodesEvents.zIndex = 2
  nodesArtifacts.zIndex = 2

  const { start: startData, stop: stopData } = await dataFactory(node.id, data => {
    renderNodes(data)
    renderStates(data.states)
    renderArtifacts(data.artifacts)
  })

  function getEventFactoryOptions(): RunGraphFetchEventsOptions {
    return {
      since: node.start_time,
      until: node.end_time ?? new Date(),
    }
  }
  const { start: startEventsData, stop: stopEventsData } = await eventDataFactory(node.id, data => {
    renderEvents(data)
  }, getEventFactoryOptions)

  let internalNode = node
  let isOpen = false

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

  async function render(node: RunGraphNode): Promise<BoundsContainer> {
    internalNode = node

    await renderBar(node)
    await renderArrowButton()
    await renderLabel(node)

    return container
  }

  async function toggle(): Promise<void> {
    if (!isOpen) {
      await open()
    } else {
      await close()
    }
  }

  async function renderStates(data?: RunGraphStateEvent[]): Promise<void> {
    const { width: nodesWidth, height } = getSize()

    const width = Math.max(bar.width, nodesWidth)

    await renderNodesState(data ?? undefined, {
      parentStartDate: internalNode.start_time,
      width,
      height,
    })
  }

  async function renderEvents(data?: RunGraphEvent[]): Promise<void> {
    const { height } = getSize()

    nodesEvents.position = { x: 0, y: height }

    if (data) {
      await renderNodesEvents(data)
      return
    }

    await updateNodesEvents()
  }

  async function renderArtifacts(data?: RunGraphArtifact[]): Promise<void> {
    const { height } = getSize()

    const y = height - config.styles.eventTargetSize
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
    container.addChild(nodesEvents)
    container.addChild(nodesArtifacts)
    container.addChild(nodesContainer)

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
    container.removeChild(nodesEvents)
    container.removeChild(nodesArtifacts)
    container.removeChild(nodesContainer)
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

  async function renderLabel(node: RunGraphNode): Promise<BoundsContainer> {
    const label = await renderLabelText(node.label)
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
      artifactPaddingY,
      artifactIconSize,
    } = config.styles

    const artifactsHeight = artifactIconSize + artifactPaddingY * 2

    const nodesHeight = isOpen
      ? nodes.height + artifactsHeight + eventTargetSize + nodesPadding * 2
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