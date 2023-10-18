import { BitmapText, Container, Graphics } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { nodeBoxFactory } from '@/factories/box'
import { nodeLabelFactory } from '@/factories/label'
import { nodesContainerFactory } from '@/factories/nodes'
import { Pixels } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'

export type FlowRunContainer = Awaited<ReturnType<typeof flowRunContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunContainerFactory(node: RunGraphNode) {
  const container = new Container()
  const { label, render: renderLabel } = await nodeLabelFactory()
  const { box, render: renderBox } = await nodeBoxFactory()
  const { container: nodesContainer, render: renderNodes } = await nodesContainerFactory(node.id)

  let open = false

  container.addChild(box)
  container.addChild(label)
  container.addChild(nodesContainer)

  container.name = DEFAULT_NODE_CONTAINER_NAME
  container.eventMode = 'static'
  container.cursor = 'pointer'

  container.on('click', toggle)
  nodesContainer.on('resized', () => container.emit('resized'))

  async function render(node: RunGraphNode): Promise<Container> {
    const label = await renderLabel(node)
    const box = await renderBox(node)

    label.position = await getLabelPosition(label, box)

    return container
  }

  function toggle(): void {
    open = !open

    if (open) {
      renderNodes()
    }

    container.emit('resized')
  }

  async function getLabelPosition(label: BitmapText, box: Graphics): Promise<Pixels> {
    const config = await waitForConfig()

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