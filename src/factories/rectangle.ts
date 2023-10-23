import { useSubscription } from '@prefecthq/vue-compositions'
import { Graphics, RenderTexture, Sprite } from 'pixi.js'
import { waitForApplication } from '@/objects'

async function getRectangleTexture(): Promise<RenderTexture> {
  const application = await waitForApplication()

  const rectangle = new Graphics()
  rectangle.beginFill('#fff')
  rectangle.drawRect(0, 0, 1, 1)
  rectangle.endFill()

  const texture = application.renderer.generateTexture(rectangle)

  return texture
}

export async function rectangleFactory(): Promise<Sprite> {
  const texture = (await useSubscription(getRectangleTexture).promise()).response

  return new Sprite(texture)
}