import { ColorSource, Container } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { nodeLabelFactory } from '@/factories/label'
import { nodeArrowButtonFactory } from '@/factories/nodeArrowButton'
import { nodeBarFactory } from '@/factories/nodeBar'
import { nodesContainerFactory } from '@/factories/nodes'
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
  const { container: nodesContainer, render: renderNodes, stop: stopNodes, getHeight: getNodesHeight } = await nodesContainerFactory(node.id)
  const { container: arrowButton, render: renderArrowButtonContainer } = await nodeArrowButtonFactory()

  let isOpen = false

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

    return container
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
    const offset = 4
    const buttonSize = config.styles.nodeHeight - offset
    const inside = bar.width > buttonSize
    const background = getArrowButtonBackground({ inside })

    const container = await renderArrowButtonContainer({
      arrow: {
        size: 10,
        stroke: 2,
      },
      button: {
        width: buttonSize,
        height: buttonSize,
        background: background,
        radius: config.styles.nodeBorderRadius - offset / 2,
      },
      isOpen,
    })

    container.x = inside ? offset / 2 : bar.width + config.styles.nodeMargin
    container.y = offset / 2

    return container
  }

  type ArrowButtonBackgroundParameters = {
    inside: boolean,
  }

  function getArrowButtonBackground({ inside }: ArrowButtonBackgroundParameters): ColorSource {
    if (inside) {
      const { background } = config.styles.node(node)

      return background ?? '#fff'
    }

    return '#333'
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
    const y = bar.height / 2
    const x = inside ? labelMinLeft + margin : arrowButton.x + arrowButton.width + margin

    label.anchor.set(0, 0.5)
    label.position = { x, y }

    return label
  }

  function resized(): void {
    const height = getHeight()

    container.emit('resized', { height })
  }

  function getHeight(): number {
    const nodesHeight = isOpen ? getNodesHeight() : 0
    const flowRunNodeHeight = config.styles.nodeHeight

    return flowRunNodeHeight + nodesHeight
  }

  return {
    kind: 'flow-run' as const,
    container,
    render,
  }
}