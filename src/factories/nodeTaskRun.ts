import { nodeLabelFactory } from '@/factories/label'
import { nodeBarFactory } from '@/factories/nodeBar'
import { BoundsContainer } from '@/models/boundsContainer'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'

export type TaskRunContainer = Awaited<ReturnType<typeof taskRunContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function taskRunContainerFactory() {
  const config = await waitForConfig()
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

    updateLabel()

    return container
  }

  function updateLabel(): void {
    const colorOnNode = config.styles.colorMode === 'dark'
      ? config.styles.textDefault
      : config.styles.textInverse

    const padding = config.styles.nodePadding
    const inside = bar.width > padding + label.width + padding
    const x = inside ? padding : bar.width + padding
    const y = config.styles.nodeHeight / 2 - label.height / 2

    label.position = { x, y }
    label.tint = inside ? colorOnNode : config.styles.textDefault
  }

  return {
    kind: 'task-run' as const,
    element: container,
    render,
    bar,
  }
}