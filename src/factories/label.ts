import { BitmapText } from 'pixi.js'
import { waitForLabelCull } from '@/objects/culling'
import { waitForFonts } from '@/objects/fonts'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeLabelFactory(disableCulling?: boolean) {
  const { inter } = await waitForFonts()
  const cull = await waitForLabelCull()

  const label = inter('')

  if (!disableCulling) {
    cull.add(label)
  }

  async function render(text: string): Promise<BitmapText> {
    label.text = text

    return await label
  }

  return {
    element: label,
    render,
  }
}