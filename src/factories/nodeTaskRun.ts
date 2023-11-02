import { nodeLabelFactory } from '@/factories/label'
import { nodeBarFactory } from '@/factories/nodeBar'
import { BoundsContainer } from '@/models/boundsContainer'
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
    await Promise.all([
      renderBar(node),
      renderLabel(node.label),
    ])

    await updateLabel(node)

    return container
  }

  async function updateLabel(node: RunGraphNode): Promise<void> {
    const config = await waitForConfig()
    const { colorOnBackground = '#fff' } = config.styles.node(node)

    const padding = config.styles.nodePadding
    const inside = bar.width > padding + label.width + padding
    const x = inside ? padding : bar.width + padding
    const y = bar.height / 2 - label.height / 2

    label.position = { x, y }
    label.tint = inside ? colorOnBackground : config.styles.textDefault
  }

  return {
    kind: 'task-run' as const,
    element: container,
    render,
    bar,
  }
}