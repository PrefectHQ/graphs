import { BitmapText, Container, Graphics } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { nodeBoxFactory } from '@/factories/box'
import { nodeLabelFactory } from '@/factories/label'
import { Pixels } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'

export type TaskRunContainer = Awaited<ReturnType<typeof taskRunContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function taskRunContainerFactory() {
  const container = new Container()
  const { label, render: renderLabel } = await nodeLabelFactory()
  const { box, render: renderBox } = await nodeBoxFactory()

  container.addChild(box)
  container.addChild(label)

  container.eventMode = 'none'
  container.name = DEFAULT_NODE_CONTAINER_NAME

  async function render(node: RunGraphNode): Promise<Container> {
    const label = await renderLabel(node)
    const box = await renderBox(node)

    label.position = await getLabelPosition(label, box)

    return container
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
    kind: 'task-run' as const,
    render,
    container,
  }
}