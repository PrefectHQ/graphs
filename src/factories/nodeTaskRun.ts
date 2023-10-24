import { BitmapText, Container } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { nodeLabelFactory } from '@/factories/label'
import { nodeBarFactory } from '@/factories/nodeBar'
import { Pixels } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'

export type TaskRunContainer = Awaited<ReturnType<typeof taskRunContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function taskRunContainerFactory() {
  const container = new Container()
  const { label, render: renderLabel } = await nodeLabelFactory()
  const { bar, render: renderBar } = await nodeBarFactory()

  container.addChild(bar)
  container.addChild(label)

  container.eventMode = 'none'
  container.name = DEFAULT_NODE_CONTAINER_NAME

  async function render(node: RunGraphNode): Promise<Container> {
    const label = await renderLabel(node)
    const bar = await renderBar(node)

    label.position = await getLabelPosition(label, bar)

    return container
  }

  async function getLabelPosition(label: BitmapText, bar: Container): Promise<Pixels> {
    const config = await waitForConfig()

    // todo: this should probably be nodePadding
    const margin = config.styles.nodeMargin
    const inside = bar.width > margin + label.width + margin
    const y = bar.height / 2 - label.height

    if (inside) {
      return {
        x: margin,
        y,
      }
    }

    return {
      x: bar.width + margin,
      y,
    }
  }

  return {
    kind: 'task-run' as const,
    render,
    container,
    bar,
  }
}