import { BitmapText } from 'pixi.js'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForFonts } from '@/objects/fonts'
import { waitForLabelCull } from '@/objects/labelCulling'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeLabelFactory() {
  const { inter } = await waitForFonts()
  const cull = await waitForLabelCull()

  const label = inter('', {
    fontSize: 12,
  })

  cull.add(label)

  async function render(node: RunGraphNode): Promise<BitmapText> {
    label.text = node.label

    return await label
  }

  return {
    label,
    render,
  }
}