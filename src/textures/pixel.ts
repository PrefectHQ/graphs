import { useSubscription } from '@prefecthq/vue-compositions'
import { Graphics, RenderTexture } from 'pixi.js'
import { waitForApplication } from '@/objects/application'

async function texture(): Promise<RenderTexture> {
  const application = await waitForApplication()

  const rectangle = new Graphics()
  rectangle.beginFill('#fff')
  rectangle.drawRect(0, 0, 1, 1)
  rectangle.endFill()

  const texture = application.renderer.generateTexture(rectangle)

  return texture
}

export async function getPixelTexture(): Promise<RenderTexture> {
  return (await useSubscription(texture).promise()).response
}