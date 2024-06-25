import { DEFAULT_SUBFLOW_BORDER_Z_INDEX, DEFAULT_SUBFLOW_LABEL_Z_INDEX, DEFAULT_SUBFLOW_NODES_Z_INDEX, DEFAULT_SUBFLOW_NODE_Z_INDEX } from '@/consts'
import { borderFactory } from '@/factories/border'
import { nodeLabelFactory } from '@/factories/label'
import { nodeArrowButtonFactory } from '@/factories/nodeArrowButton'
import { nodeBarFactory } from '@/factories/nodeBar'
import { nodesContainerFactory } from '@/factories/nodes'
import { BoundsContainer } from '@/models/boundsContainer'
import { NodeSize } from '@/models/layout'
import { RunGraphData, RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { cull } from '@/objects/culling'
import { layout } from '@/objects/settings'

export type TaskRunContainer = Awaited<ReturnType<typeof taskRunContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function taskRunContainerFactory(node: RunGraphNode, nestedGraph: RunGraphData | undefined) {
  const config = await waitForConfig()
  const container = new BoundsContainer()
  const { element: label, render: renderLabelText } = await nodeLabelFactory()
  const { element: border, render: renderBorderContainer } = await borderFactory()
  const { element: bar, render: renderBar } = await nodeBarFactory()
  const { element: arrowButton, render: renderArrowButtonContainer } = await nodeArrowButtonFactory()
  const { element: nodesContainer, render: renderNodes, getSize: getNodesSize, stopWorker: stopNodesWorker } = await nodesContainerFactory()

  container.addChild(bar)
  container.addChild(label)

  let isOpen = false
  let internalNode = node
  let internalNestedGraph = nestedGraph

  container.sortableChildren = true

  border.zIndex = DEFAULT_SUBFLOW_BORDER_Z_INDEX
  bar.zIndex = DEFAULT_SUBFLOW_NODE_Z_INDEX
  label.zIndex = DEFAULT_SUBFLOW_LABEL_Z_INDEX
  arrowButton.zIndex = DEFAULT_SUBFLOW_LABEL_Z_INDEX
  nodesContainer.zIndex = DEFAULT_SUBFLOW_NODES_Z_INDEX

  border.eventMode = 'none'
  border.cursor = 'default'

  nodesContainer.position = { x: 0, y: config.styles.nodeHeight + config.styles.nodesPadding }

  nodesContainer.on('rendered', () => {
    cull()
    resized()
  })

  arrowButton.on('click', event => {
    event.stopPropagation()
    toggle()
  })

  async function render(newNodeData: RunGraphNode, newNestedGraph: RunGraphData | undefined): Promise<BoundsContainer> {
    internalNode = newNodeData
    internalNestedGraph = newNestedGraph

    if (newNestedGraph) {
      container.addChild(arrowButton)
    }

    await renderBar(newNodeData)

    if (newNestedGraph) {
      await renderArrowButton()
    }

    if (isOpen) {
      if (newNestedGraph) {
        renderNodes(newNestedGraph)
      }

      await renderBorder()
    }


    await renderLabel()

    return container
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

  async function toggle(): Promise<void> {
    if (!isOpen) {
      await open()
    } else {
      await close()
    }
  }

  async function open(): Promise<void> {
    isOpen = true
    container.addChild(nodesContainer)
    container.addChild(border)

    if (!internalNestedGraph) {
      throw new Error('Attempted to open without nested graph data')
    }

    await Promise.all([
      renderNodes(internalNestedGraph),
      render(internalNode, internalNestedGraph),
    ])

    resized()
  }

  async function close(): Promise<void> {
    isOpen = false
    container.removeChild(nodesContainer)
    container.removeChild(border)

    stopNodesWorker()

    await render(internalNode, internalNestedGraph)

    resized()
  }

  function getSize(): NodeSize {
    const nodes = getNodesSize()
    const {
      nodeHeight,
      nodesPadding,
    } = config.styles


    const nodesHeight = isOpen
      ? nodes.height + nodesPadding * 2
      : 0
    const nodesWidth = isOpen ? nodes.width : 0
    const flowRunNodeHeight = nodeHeight

    return {
      height: flowRunNodeHeight + nodesHeight,
      width: Math.max(nodesWidth, container.width),
    }
  }

  function resized(): void {
    if (isOpen) {
      renderBorder()
    }

    const size = getSize()

    container.emit('resized', size)
  }


  return {
    kind: 'task-run' as const,
    element: container,
    render,
    bar,
  }
}