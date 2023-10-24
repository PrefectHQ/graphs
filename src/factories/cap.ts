import { useSubscription } from '@prefecthq/vue-compositions'
import { Graphics, Rectangle, Sprite, Texture } from 'pixi.js'
import { waitForApplication } from '@/objects'

type CapStyle = {
  height: number,
  radius: number,
}

async function getCapTexture({ height, radius }: CapStyle): Promise<Texture> {
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

type CapSprites = {
  left: Sprite,
  right: Sprite,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function capFactory() {
  const left = new Sprite()
  const right = new Sprite()

  async function render(style: CapStyle): Promise<CapSprites> {
    const texture = (await useSubscription(getCapTexture, [style]).promise()).response
    left.texture = texture
    right.texture = texture

    right.anchor.x = 1
    right.scale.x = -1

    return {
      left,
      right,
    }
  }

  return {
    left,
    right,
    render,
  }
}