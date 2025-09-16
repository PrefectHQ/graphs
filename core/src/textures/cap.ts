import { Graphics, Rectangle, Texture } from 'pixi.js'
import { DEFAULT_TEXTURE_RESOLUTION } from '@/consts'
import { waitForApplication } from '@/objects/application'
import { cache } from '@/objects/cache'

export type CapStyle = {
  height: number,
  radius: number,
}

async function texture({ height, radius }: CapStyle): Promise<Texture> {
  const application = await waitForApplication()

  const graphic = new Graphics()
  graphic.beginFill('#fff')
  graphic.drawRoundedRect(0, 0, radius * 2, height, radius)
  graphic.endFill()

  const cap = application.renderer.generateTexture(graphic)

  return cap
}

export async function getCapTexture(style: CapStyle): Promise<Texture> {
  return await cache(texture, [style])
}