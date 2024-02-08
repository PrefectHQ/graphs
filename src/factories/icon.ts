import { Sprite } from 'pixi.js'
import { IconName } from '@/models/icon'
import { waitForIconCull } from '@/objects/culling'
import { getIconTexture } from '@/textures/icon'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function iconFactory(disableCulling?: boolean) {
  const cull = await waitForIconCull()
  const element = new Sprite()

  if (!disableCulling) {
    cull.add(element)
  }

  async function render(icon: IconName): Promise<Sprite> {
    const texture = await getIconTexture(icon)

    element.texture = texture

    return element
  }

  return {
    element,
    render,
  }
}