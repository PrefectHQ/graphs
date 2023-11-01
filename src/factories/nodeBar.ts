import { differenceInMilliseconds, millisecondsInSecond } from 'date-fns'
import { Container } from 'pixi.js'
import { barFactory } from '@/factories/bar'
import { borderFactory } from '@/factories/border'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { isSelected } from '@/objects/selection'
import { layout, getHorizontalColumnSize } from '@/objects/settings'

const borderOffset = 3
const borderStroke = 2

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeBarFactory() {
  const config = await waitForConfig()
  const container = new Container()
  const { element: bar, render: renderBar } = await barFactory()
  const { element: border, render: renderBorder } = await borderFactory()

  container.addChild(bar)

  border.position.set(-borderOffset, -borderOffset)

  async function render(node: RunGraphNode): Promise<Container> {
    const { background = '#fff' } = config.styles.node(node)
    const { nodeHeight: height, nodeBorderRadius: radius } = config.styles
    const width = getTotalWidth(node, radius)
    const capLeft = node.state_type !== 'RUNNING'

    await renderBar({
      width,
      height,
      radius,
      background,
      capLeft,
    })

    await renderSelectedBorder(node, width, height)

    return bar
  }

  async function renderSelectedBorder(node: RunGraphNode, width: number, height: number): Promise<void> {
    if (!isSelected(node)) {
      container.removeChild(border)
      return
    }

    container.addChild(border)

    await renderBorder({
      stroke: borderStroke,
      radius: config.styles.nodeBorderRadius,
      width: width + borderOffset * 2,
      height: height + borderOffset * 2,
      color: config.styles.nodeSelectedBorderColor,
    })
  }

  function getTotalWidth(node: RunGraphNode, borderRadius: number): number {
    const columnSize = getHorizontalColumnSize()

    if (layout.isTrace()) {
      const right = node.start_time
      const left = node.end_time ?? new Date()
      const seconds = differenceInMilliseconds(left, right) / millisecondsInSecond
      const width = seconds * columnSize

      // this means the min node size is 18px. Is that correct?
      return Math.max(width, borderRadius * 2)
    }

    return columnSize
  }

  return {
    element: container,
    render,
  }
}