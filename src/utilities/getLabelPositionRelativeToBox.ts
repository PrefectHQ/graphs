import { BitmapText, Graphics } from 'pixi.js'
import { Pixels } from '@/models/layout'
import { waitForConfig } from '@/objects/config'

export async function getLabelPositionRelativeToBox(label: BitmapText, box: Graphics): Promise<Pixels> {
  const config = await waitForConfig()

  // todo: this should probably be nodePadding
  const margin = config.styles.nodeMargin
  const inside = box.width > margin + label.width + margin
  const y = box.height / 2 - label.height

  if (inside) {
    return {
      x: margin,
      y,
    }
  }

  return {
    x: box.width + margin,
    y,
  }
}