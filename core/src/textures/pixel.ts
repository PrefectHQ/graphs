import { Graphics, Texture } from 'pixi.js'
import { waitForApplication } from '@/objects/application'
import { cache } from '@/objects/cache'

async function texture(): Promise<Texture> {
  const application = await waitForApplication()

  const rectangle = new Graphics()
  rectangle.beginFill('#fff')
  rectangle.drawRect(0, 0, 1, 1)
  rectangle.endFill()

  const texture = application.renderer.generateTexture(rectangle)

  return texture
}

export async function getPixelTexture(): Promise<Texture> {
  return await cache(texture, [])
}