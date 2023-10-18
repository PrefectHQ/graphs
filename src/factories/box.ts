import { differenceInMilliseconds, millisecondsInSecond } from 'date-fns'
import { Graphics } from 'pixi.js'
import { DEFAULT_TIME_COLUMN_SIZE_PIXELS } from '@/consts'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeBoxFactory() {
  const config = await waitForConfig()
  const box = new Graphics()

  async function render(node: RunGraphNode): Promise<Graphics> {
    const { background } = config.styles.node(node)

    const right = node.start_time
    const left = node.end_time ?? new Date()
    const seconds = differenceInMilliseconds(left, right) / millisecondsInSecond
    const boxWidth = seconds * DEFAULT_TIME_COLUMN_SIZE_PIXELS
    const boxHeight = config.styles.nodeHeight - config.styles.nodeMargin * 2

    box.clear()
    box.lineStyle(1, 0x0, 1, 2)
    box.beginFill(background)
    box.drawRoundedRect(0, 0, boxWidth, boxHeight, 4)
    box.endFill()

    return await box
  }

  return {
    box,
    render,
  }
}