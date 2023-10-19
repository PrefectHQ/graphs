import { differenceInMilliseconds, millisecondsInSecond } from 'date-fns'
import { Graphics } from 'pixi.js'
import { DEFAULT_LINEAR_COLUMN_SIZE_PIXELS, DEFAULT_TIME_COLUMN_SIZE_PIXELS } from '@/consts'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { layout } from '@/objects/layout'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeBoxFactory() {
  const config = await waitForConfig()
  const box = new Graphics()

  async function render(node: RunGraphNode): Promise<Graphics> {
    const { background } = config.styles.node(node)

    const width = getWidth(node)
    const height = config.styles.nodeHeight - config.styles.nodeMargin * 2

    box.clear()
    box.lineStyle(1, 0x0, 1, 2)
    box.beginFill(background)
    box.drawRoundedRect(0, 0, width, height, 4)
    box.endFill()

    return await box
  }

  function getWidth(node: RunGraphNode): number {
    if (layout.horizontal === 'trace') {
      const right = node.start_time
      const left = node.end_time ?? new Date()
      const seconds = differenceInMilliseconds(left, right) / millisecondsInSecond
      const width = seconds * DEFAULT_TIME_COLUMN_SIZE_PIXELS

      return width
    }

    return DEFAULT_LINEAR_COLUMN_SIZE_PIXELS
  }

  return {
    box,
    render,
  }
}