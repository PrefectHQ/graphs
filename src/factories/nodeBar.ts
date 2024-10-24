import { differenceInMilliseconds } from 'date-fns'
import { millisecondsInSecond } from 'date-fns/constants'
import { Container } from 'pixi.js'
import { barFactory } from '@/factories/bar'
import { GraphNode } from '@/models'
import { waitForConfig } from '@/objects/config'
import { layout, getHorizontalColumnSize, waitForSettings } from '@/objects/settings'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeBarFactory() {
  const config = await waitForConfig()
  const settings = await waitForSettings()
  const container = new Container()
  const { element: bar, render: renderBar } = await barFactory()

  container.addChild(bar)

  async function render(node: GraphNode): Promise<Container> {
    const { background = '#fff' } = config.styles.node(node)
    const { nodeHeight: height, nodeRadius: radius } = config.styles
    const width = getTotalWidth(node, radius)

    const capRight = settings.isDependency()

    await Promise.all([
      renderBar({
        width,
        height,
        radius,
        background,
        capRight,
      }),
    ])

    return bar
  }

  function getTotalWidth(node: GraphNode, borderRadius: number): number {
    const columnSize = getHorizontalColumnSize()

    if (layout.isTemporal() || layout.isLeftAligned()) {
      const right = node.start
      const left = node.end ?? new Date()
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