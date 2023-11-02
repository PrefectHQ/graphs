import { borderFactory } from '@/factories/border'
import { dataFactory } from '@/factories/data'
import { nodeLabelFactory } from '@/factories/label'
import { nodeArrowButtonFactory } from '@/factories/nodeArrowButton'
import { nodeBarFactory } from '@/factories/nodeBar'
import { nodesContainerFactory } from '@/factories/nodes'
import { BoundsContainer } from '@/models/boundsContainer'
import { NodeSize } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { cull } from '@/objects/culling'

export type FlowRunContainer = Awaited<ReturnType<typeof flowRunContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunContainerFactory(node: RunGraphNode) {
  const container = new BoundsContainer()
  const config = await waitForConfig()
  const { element: bar, render: renderBar } = await nodeBarFactory()
  const { element: label, render: renderLabelText } = await nodeLabelFactory()
  const { element: nodesContainer, render: renderNodes, getSize: getNodesSize } = await nodesContainerFactory()
  const { element: arrowButton, render: renderArrowButtonContainer } = await nodeArrowButtonFactory()
  const { element: border, render: renderBorderContainer } = await borderFactory()
  const { start: startData, stop: stopData } = await dataFactory(node.id, data => {
    renderNodes(data)
  })

  let internalNode = node
  let isOpen = false

  container.addChild(border)
  container.addChild(bar)
  container.addChild(label)
  container.addChild(arrowButton)

  arrowButton.on('click', event => {
    event.stopPropagation()
    toggle()
  })

  nodesContainer.position = { x: 0, y: config.styles.nodeHeight }

  nodesContainer.on('rendered', () => {
    cull()
    resized()
  })

  async function render(node: RunGraphNode): Promise<BoundsContainer> {
    internalNode = node

    await renderBar(node)
    await renderArrowButton(node)
    await renderLabel(node)
    await renderBorder(node)

    return container
  }

  async function toggle(): Promise<void> {
    if (!isOpen) {
      await open()
    } else {
      await close()
    }
  }

  async function renderBorder(node: RunGraphNode): Promise<void> {
    const { background = '#fff' } = config.styles.node(node)
    const offset = 4
    const { width: nodesWidth, height: nodesHeight } = getNodesSize()
    const openHeight = nodesHeight + config.styles.nodeHeight + offset * 2
    const closedHeight = config.styles.nodeHeight

    const position = isOpen ? -offset : offset
    const borderWidth = Math.max(bar.width, nodesWidth)
    const width = isOpen ? borderWidth + offset * 2 : bar.width - offset * 2
    const height = isOpen ? openHeight : closedHeight
    const stroke = isOpen ? 2 : 1

    const border = await renderBorderContainer({
      width,
      height,
      stroke,
      radius: config.styles.nodeBorderRadius,
      color: background,
    })

    border.position.set(position, position)
  }

  async function open(): Promise<void> {
    isOpen = true
    container.addChild(nodesContainer)

    await Promise.all([
      startData(),
      render(internalNode),
    ])

    resized()
  }

  async function close(): Promise<void> {
    isOpen = false
    container.removeChild(nodesContainer)

    await Promise.all([
      stopData(),
      render(internalNode),
    ])

    resized()
  }

  async function renderArrowButton(node: RunGraphNode): Promise<BoundsContainer> {
    const buttonSize = config.styles.nodeToggleSize
    const offset = config.styles.nodeHeight - buttonSize
    const inside = bar.width > buttonSize
    const { background = '#fff' } = config.styles.node(node)

    const container = await renderArrowButtonContainer({
      background,
      inside,
      isOpen,
    })

    container.x = inside ? offset / 2 : bar.width + config.styles.nodePadding
    container.y = offset / 2

    return container
  }

  async function renderLabel(node: RunGraphNode): Promise<BoundsContainer> {
    const label = await renderLabelText(node)

    const padding = config.styles.nodePadding
    const rightOfButton = arrowButton.x + arrowButton.width + padding
    const rightOfBar = bar.width + padding
    const inside = bar.width > rightOfButton + label.width + padding

    const y = config.styles.nodeHeight / 2 - label.height / 2
    const x = inside ? rightOfButton : Math.max(rightOfBar, rightOfButton)

    label.position = { x, y }

    return label
  }

  function resized(): void {
    renderBorder(internalNode)
    const size = getSize()

    container.emit('resized', size)
  }

  function getSize(): NodeSize {
    const nodes = getNodesSize()
    const nodesHeight = isOpen ? nodes.height : 0
    const nodesWidth = isOpen ? nodes.width : 0
    const flowRunNodeHeight = config.styles.nodeHeight

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