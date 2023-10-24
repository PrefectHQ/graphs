import { useSubscription } from '@prefecthq/vue-compositions'
import { Graphics, Rectangle, Texture } from 'pixi.js'
import { waitForApplication } from '@/objects/application'

export type CapStyle = {
  height: number,
  radius: number,
}

async function cap({ height, radius }: CapStyle): Promise<Texture> {
  const application = await waitForApplication()

  const graphic = new Graphics()
  graphic.beginFill('#fff')
  graphic.drawRoundedRect(0, 0, radius * 2, height, radius)
  graphic.endFill()

  const cap = application.renderer.generateTexture(graphic, {
    // drew a rounded rectangle and then just using half of the graphic to get just the left "cap"
    region: new Rectangle(0, 0, radius, height),

    // manually bumping up the resolution to keep the border radius from being blurry
    resolution: 10,
  })

  return cap
}

export async function getCapTexture(style: CapStyle): Promise<Texture> {
  return (await useSubscription(cap, [style]).promise()).response
}