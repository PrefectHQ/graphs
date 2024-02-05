import { Sprite } from 'pixi.js'
import { IconName } from '@/models/icon'
import { getIconTexture } from '@/textures/icon'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function iconFactory() {
  const element = new Sprite()

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