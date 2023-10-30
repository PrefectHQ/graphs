import { differenceInMilliseconds, millisecondsInSecond } from 'date-fns'
import { Container } from 'pixi.js'
import { DEFAULT_LINEAR_COLUMN_SIZE_PIXELS, DEFAULT_TIME_COLUMN_SIZE_PIXELS } from '@/consts'
import { barFactory } from '@/factories/bar'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { layout } from '@/objects/layout'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeBarFactory() {
  const config = await waitForConfig()
  const { bar, render: renderBar } = await barFactory()

  async function render(node: RunGraphNode): Promise<Container> {
    const { background = '#fff' } = config.styles.node(node)
    const { nodeHeight: height, nodeBorderRadius: radius } = config.styles
    const width = getTotalWidth(node, radius)
    const capLeft = node.state_type !== 'running'

    await renderBar({
      width,
      height,
      radius,
      background,
      capLeft,
    })

    return bar
  }

  function getTotalWidth(node: RunGraphNode, borderRadius: number): number {
    if (layout.isTrace()) {
      const right = node.start_time
      const left = node.end_time ?? new Date()
      const seconds = differenceInMilliseconds(left, right) / millisecondsInSecond
      const width = seconds * DEFAULT_TIME_COLUMN_SIZE_PIXELS

      // this means the min node size is 18px. Is that correct?
      return Math.max(width, borderRadius * 2)
    }

    return DEFAULT_LINEAR_COLUMN_SIZE_PIXELS
  }

  return {
    bar,
    render,
  }
}