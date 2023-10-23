import { BitmapText, Container, Sprite } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { ArrowDirection, arrowFactory } from '@/factories/arrow'
import { nodeLabelFactory } from '@/factories/label'
import { nodeBarFactory } from '@/factories/nodeBar'
import { nodesContainerFactory } from '@/factories/nodes'
import { Pixels } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'

export type FlowRunContainer = Awaited<ReturnType<typeof flowRunContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunContainerFactory(node: RunGraphNode) {
  const container = new Container()
  const config = await waitForConfig()
  const { bar, render: renderBar } = await nodeBarFactory()
  const { label, render: renderLabel } = await nodeLabelFactory()
  const { container: nodesContainer, render: renderNodes, stop: stopNodes } = await nodesContainerFactory(node.id)
  const { arrow, render: renderArrowSprite } = await arrowFactory()
  let isOpen = false

  container.addChild(bar)
  container.addChild(label)
  container.addChild(nodesContainer)
  container.addChild(arrow)

  container.name = DEFAULT_NODE_CONTAINER_NAME
  container.eventMode = 'static'
  container.cursor = 'pointer'

  container.on('click', toggle)

  nodesContainer.visible = false
  nodesContainer.position = { x: 0, y: config.styles.nodeHeight }
  nodesContainer.on('resized', () => container.emit('resized'))

  async function render(node: RunGraphNode): Promise<Container> {
    const label = await renderLabel(node)
    const bar = await renderBar(node)
    const arrow = await renderArrow()

    label.position = await getLabelPosition({
      label,
      bar,
      arrow,
    })

    return container
  }

  async function renderArrow(): Promise<Sprite> {
    const size = 10
    const rotate = isOpen ? ArrowDirection.Down : ArrowDirection.Up
    const arrow = await renderArrowSprite({ size, stroke: 2, radius: 2, rotate })

    const middle = bar.height / 2
    const offset = size / 4
    arrow.y = isOpen ? middle - offset : middle + offset
    arrow.x = config.styles.nodeMargin + size

    return arrow
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
    nodesContainer.visible = true

    await Promise.all([
      render(node),
      renderNodes(),
    ])

    container.emit('resized')
  }

  async function close(): Promise<void> {
    isOpen = false
    nodesContainer.visible = false

    await Promise.all([
      render(node),
      stopNodes(),
    ])

    container.emit('resized')
  }

  type LabelPositionObjects = {
    label: BitmapText,
    bar: Container,
    arrow: Sprite,
  }

  async function getLabelPosition({ label, arrow, bar }: LabelPositionObjects): Promise<Pixels> {
    const config = await waitForConfig()

    // todo: this should probably be nodePadding
    const margin = config.styles.nodeMargin
    const inside = bar.width > margin + label.width + arrow.width + margin
    const y = bar.height / 2 - label.height

    if (inside) {
      return {
        x: margin + arrow.width + margin,
        y,
      }
    }

    return {
      x: bar.width + margin,
      y,
    }
  }

  return {
    kind: 'flow-run' as const,
    container,
    render,
  }
}