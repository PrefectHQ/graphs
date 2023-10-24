import { useSubscription } from '@prefecthq/vue-compositions'
import { Graphics, Rectangle, Sprite, Texture } from 'pixi.js'
import { waitForApplication } from '@/objects'

export type ArrowStyle = {
  size: number,
  radius?: number,
  stroke?: number,
  rotate?: number,
}

export enum ArrowDirection {
  Up = 0,
  Down = 180,
  Left = 270,
  Right = 90
}

async function getArrowTexture({ size, stroke = 1, radius = 0 }: ArrowStyle): Promise<Texture> {
  const application = await waitForApplication()

  const graphic = new Graphics()
  graphic.lineStyle(stroke, '#fff', 1, 0)
  graphic.drawRoundedRect(0, 0, size * 2, size * 2, radius)

  const arrow = application.renderer.generateTexture(graphic, {
    // drew a rounded rectangle and then just using one corner as the "arrow"
    region: new Rectangle(0, 0, size, size),

    // manually bumping up the resolution to keep the border radius from being blurry
    resolution: 10,
  })

  return arrow
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function arrowFactory() {
  const arrow = new Sprite()

  async function render(style: ArrowStyle): Promise<Sprite> {
    const texture = (await useSubscription(getArrowTexture, [style]).promise()).response
    arrow.texture = texture

    const { rotate = 0 } = style

    arrow.anchor.set(0.5, 0.5)
    // texture is the corner of a rectangle so 45 deg defaults the arrow to pointing up
    arrow.angle = 45 + rotate

    return arrow
  }

  return {
    arrow,
    render,
  }
}