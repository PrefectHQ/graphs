import { BitmapText, Container } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
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

  let open = false

  container.addChild(bar)
  container.addChild(label)
  container.addChild(nodesContainer)

  container.name = DEFAULT_NODE_CONTAINER_NAME
  container.eventMode = 'static'
  container.cursor = 'pointer'

  container.on('click', toggle)

  nodesContainer.visible = false
  nodesContainer.position = { x: 0, y: config.styles.nodeHeight }
  nodesContainer.on('resized', () => container.emit('resized'))

  async function render(node: RunGraphNode): Promise<Container> {
    const label = await renderLabel(node)
    const box = await renderBar(node)

    label.position = getLabelPosition(label, box)

    return container
  }

  async function toggle(): Promise<void> {
    open = !open
    nodesContainer.visible = open

    if (open) {
      await renderNodes()
    } else {
      stopNodes()
      container.emit('resized')
    }
  }

  function getLabelPosition(label: BitmapText, box: Container): Pixels {
    // todo: this should probably be nodePadding
    const margin = config.styles.nodeMargin
    const inside = box.width > margin + label.width + margin
    const y = box.height / 2 - label.height

    if (inside) {
      return {
        x: margin,
        y,
      }
    }

    return {
      x: box.width + margin,
      y,
    }
  }

  return {
    kind: 'flow-run' as const,
    container,
    render,
  }
}