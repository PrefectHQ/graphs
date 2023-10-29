import { Container } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { borderFactory } from '@/factories/border'
import { nodeLabelFactory } from '@/factories/label'
import { nodeArrowButtonFactory } from '@/factories/nodeArrowButton'
import { nodeBarFactory } from '@/factories/nodeBar'
import { nodesContainerFactory } from '@/factories/nodes'
import { NodeSize } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { cull } from '@/objects/culling'

export type FlowRunContainer = Awaited<ReturnType<typeof flowRunContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunContainerFactory(node: RunGraphNode) {
  const container = new Container()
  const config = await waitForConfig()
  const { bar, render: renderBar } = await nodeBarFactory()
  const { label, render: renderLabelText } = await nodeLabelFactory()
  const { container: nodesContainer, render: renderNodes, stop: stopNodes, getSize: getNodesSize } = await nodesContainerFactory(node.id)
  const { container: arrowButton, render: renderArrowButtonContainer } = await nodeArrowButtonFactory()
  const { border, render: renderBorderContainer } = await borderFactory()

  let isOpen = false

  container.addChild(border)
  container.addChild(bar)
  container.addChild(label)
  container.addChild(nodesContainer)
  container.addChild(arrowButton)

  container.name = DEFAULT_NODE_CONTAINER_NAME

  arrowButton.on('click', toggle)

  nodesContainer.visible = false
  nodesContainer.position = { x: 0, y: config.styles.nodeHeight }
  nodesContainer.on('resized', () => resized())

  async function render(): Promise<Container> {
    await renderBar(node)
    await renderArrowButton()
    await renderLabel()
    await renderBorder()

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

    await Promise.all([
      render(),
      renderNodes(),
    ])

    nodesContainer.visible = true
    nodesContainer.once('rendered', () => cull())

    resized()
  }

  async function close(): Promise<void> {
    isOpen = false
    nodesContainer.visible = false

    await Promise.all([
      render(),
      stopNodes(),
    ])

    cull()
    resized()
  }

  async function renderArrowButton(): Promise<Container> {
    const buttonSize = config.styles.nodeToggleSize
    const offset = config.styles.nodeHeight - buttonSize
    const inside = bar.width > buttonSize
    const { background = '#fff' } = config.styles.node(node)

    const container = await renderArrowButtonContainer({
      background,
      inside,
      isOpen,
    })

    container.x = inside ? offset / 2 : bar.width + config.styles.nodeMargin
    container.y = offset / 2

    return container
  }

  async function renderLabel(): Promise<Container> {
    const label = await renderLabelText(node)

    // todo: this should probably be nodePadding
    const margin = config.styles.nodeMargin

    const barRight = bar.x + bar.width
    const buttonRight = arrowButton.x + arrowButton.width
    const barWithoutMargin = bar.width - margin * 2

    const labelMinLeft = Math.max(barRight, buttonRight)
    const inside = barWithoutMargin > labelMinLeft + label.width
    const y = bar.height / 2 - label.height / 2
    const x = inside ? labelMinLeft + margin : arrowButton.x + arrowButton.width + margin

    label.position = { x, y }

    return label
  }

  function resized(): void {
    renderBorder()
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
    container,
    bar,
    render,
  }
}