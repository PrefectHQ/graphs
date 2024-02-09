import { Graphics, RenderTexture, WRAP_MODES } from 'pixi.js'
import { waitForApplication } from '@/objects/application'
import { cache } from '@/objects/cache'

async function texture(): Promise<RenderTexture> {
  const application = await waitForApplication()

  const rectangle = new Graphics()
  rectangle.beginFill('#fff')
  rectangle.drawRect(0, 0, 1, 1)
  rectangle.endFill()

  const texture = application.renderer.generateTexture(rectangle, {
    wrapMode: WRAP_MODES.REPEAT,
  })

  return texture
}

export async function getPixelTexture(): Promise<RenderTexture> {
  return await cache(texture, [])
}