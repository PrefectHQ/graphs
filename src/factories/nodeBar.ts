import { differenceInMilliseconds } from 'date-fns'
import { millisecondsInSecond } from 'date-fns/constants'
import { Container } from 'pixi.js'
import { barFactory } from '@/factories/bar'
import { selectedBorderFactory } from '@/factories/selectedBorder'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { isSelected } from '@/objects/selection'
import { layout, getHorizontalColumnSize, waitForSettings } from '@/objects/settings'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeBarFactory() {
  const config = await waitForConfig()
  const settings = await waitForSettings()
  const container = new Container()
  const { element: bar, render: renderBar } = await barFactory()
  const { element: border, render: renderBorder } = await selectedBorderFactory()

  container.addChild(bar)
  container.addChild(border)

  async function render(node: RunGraphNode): Promise<Container> {
    const { background = '#fff' } = config.styles.node(node)
    const { nodeHeight: height, nodeRadius: radius } = config.styles
    const selected = isSelected(node)
    const width = getTotalWidth(node, radius)

    const capRight = node.state_type !== 'RUNNING' || settings.isDependency()

    await Promise.all([
      renderBar({
        width,
        height,
        radius,
        background,
        capRight,
      }),
      renderBorder({ selected, width, height }),
    ])

    return bar
  }

  function getTotalWidth(node: RunGraphNode, borderRadius: number): number {
    const columnSize = getHorizontalColumnSize()

    if (layout.isTemporal() || layout.isLeftAligned()) {
      const right = node.start_time
      const left = node.end_time ?? new Date()
      const seconds = differenceInMilliseconds(left, right) / millisecondsInSecond
      const width = seconds * columnSize

      return Math.max(width, borderRadius * 2)
    }

    return columnSize
  }

  return {
    element: container,
    render,
  }
}