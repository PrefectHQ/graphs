import { BitmapText } from 'pixi.js'
import { waitForFonts } from '@/objects/fonts'
import { waitForLabelCull } from '@/objects/labelCulling'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeLabelFactory() {
  const { inter } = await waitForFonts()
  const cull = await waitForLabelCull()

  const label = inter('')

  cull.add(label)

  async function render(text: string): Promise<BitmapText> {
    label.text = text

    return await label
  }

  return {
    element: label,
    render,
  }
}