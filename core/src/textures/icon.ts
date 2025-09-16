import { Texture } from 'pixi.js'
import { DEFAULT_TEXT_RESOLUTION } from '@/consts'
import { IconName } from '@/models/icon'
import { cache } from '@/objects/cache'
import * as prefectIcons from '@/textures/icons'

function texture(icon: IconName): Texture {
  const options = {
    resolution: DEFAULT_TEXT_RESOLUTION,
  }

  // eslint-disable-next-line import/namespace
  const iconTexture = Texture.from(prefectIcons[icon])

  return iconTexture
}

export async function getIconTexture(icon: IconName): Promise<Texture> {
  return await cache(texture, [icon])
}