import { DEFAULT_SUBFLOW_LABEL_Z_INDEX, DEFAULT_SUBFLOW_NODE_Z_INDEX } from '@/consts'
import { nodeLabelFactory } from '@/factories/label'
import { nodeArrowButtonFactory } from '@/factories/nodeArrowButton'
import { nodeBarFactory } from '@/factories/nodeBar'
import { BoundsContainer } from '@/models/boundsContainer'
import { RunGraphData, RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'

export type TaskRunContainer = Awaited<ReturnType<typeof taskRunContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function taskRunContainerFactory(node: RunGraphNode, nestedGraph: RunGraphData | undefined) {
  const config = await waitForConfig()
  const container = new BoundsContainer()
  const { element: label, render: renderLabelText } = await nodeLabelFactory()
  const { element: bar, render: renderBar } = await nodeBarFactory()
  const { element: arrowButton, render: renderArrowButtonContainer } = await nodeArrowButtonFactory()

  container.addChild(bar)
  container.addChild(label)

  let isOpen = false
  let internalNode = node
  let internalNestedGraph = nestedGraph

  container.sortableChildren = true

  // border.zIndex = DEFAULT_SUBFLOW_BORDER_Z_INDEX
  bar.zIndex = DEFAULT_SUBFLOW_NODE_Z_INDEX
  label.zIndex = DEFAULT_SUBFLOW_LABEL_Z_INDEX
  arrowButton.zIndex = DEFAULT_SUBFLOW_LABEL_Z_INDEX

  // nodesContainer.zIndex = DEFAULT_SUBFLOW_NODES_Z_INDEX

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

  async function toggle(): Promise<void> {
    if (!isOpen) {
      await open()
    } else {
      await close()
    }
  }

  async function open(): Promise<void> {
    isOpen = true
    // container.addChild(nodesState)
    // container.addChild(nodesContainer)
    // container.addChild(border)

    await render(internalNode, internalNestedGraph)

    resized()
  }

  async function close(): Promise<void> {
    isOpen = false
    // container.removeChild(nodesState)
    // container.removeChild(nodesContainer)
    // container.removeChild(border)

    await render(internalNode, internalNestedGraph)

    resized()
  }

  function resized(): void {
    if (isOpen) {
      // renderBorder()
    }

    // const size = getSize()

    // container.emit('resized', size)
  }


  return {
    kind: 'task-run' as const,
    element: container,
    render,
    bar,
  }
}