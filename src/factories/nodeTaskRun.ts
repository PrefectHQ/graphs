import { BitmapText } from 'pixi.js'
import { nodeLabelFactory } from '@/factories/label'
import { nodeBarFactory } from '@/factories/nodeBar'
import { BoundsContainer } from '@/models/boundsContainer'
import { Pixels } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'

export type TaskRunContainer = Awaited<ReturnType<typeof taskRunContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function taskRunContainerFactory() {
  const container = new BoundsContainer()
  const { element: label, render: renderLabel } = await nodeLabelFactory()
  const { element: bar, render: renderBar } = await nodeBarFactory()

  container.addChild(bar)
  container.addChild(label)

  async function render(node: RunGraphNode): Promise<BoundsContainer> {
    const label = await renderLabel(node)
    const bar = await renderBar(node)

    label.position = await getLabelPosition(label, bar)

    return container
  }

  async function getLabelPosition(label: BitmapText, bar: BoundsContainer): Promise<Pixels> {
    const config = await waitForConfig()

    // todo: this should probably be nodePadding
    const margin = config.styles.nodePadding
    const inside = bar.width > margin + label.width + margin
    const y = bar.height / 2 - label.height / 2

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
    element: container,
    render,
    bar,
  }
}