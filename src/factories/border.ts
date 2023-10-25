import { ColorSource, Container, Sprite, Texture } from 'pixi.js'
import { CornerStyle, getCornerTexture } from '@/textures/corner'
import { getPixelTexture } from '@/textures/pixel'

export type BorderStyle = {
  width: number,
  height: number,
  stroke: number,
  radius?: number,
  color?: ColorSource,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function borderFactory() {
  const container = new Container()
  const topLeft = new Sprite()
  const topRight = new Sprite()
  const bottomLeft = new Sprite()
  const bottomRight = new Sprite()
  const left = new Sprite()
  const right = new Sprite()
  const top = new Sprite()
  const bottom = new Sprite()

  container.addChild(topLeft)
  container.addChild(topRight)
  container.addChild(bottomLeft)
  container.addChild(bottomRight)
  container.addChild(left)
  container.addChild(right)
  container.addChild(top)
  container.addChild(bottom)

  async function render(style: BorderStyle): Promise<Container> {
    const { radius = 0, color = '#fff', stroke } = style
    const size = radius * 2

    const cornerStyle: CornerStyle = {
      size,
      radius,
      stroke,
    }

    const corner = await getCornerTexture(cornerStyle)
    const pixel = await getPixelTexture()

    setCornerTexture(corner)
    setBorderTexture(pixel)
    setTint(color)

    return container
  }

  function setCornerTexture(texture: Texture): void {
    topLeft.texture = texture
    topRight.texture = texture
    bottomLeft.texture = texture
    bottomRight.texture = texture
  }

  function setBorderTexture(texture: Texture): void {
    top.texture = texture
    left.texture = texture
    right.texture = texture
    bottom.texture = texture
  }

  function setTint(color: ColorSource): void {
    topLeft.tint = color
    topRight.tint = color
    bottomLeft.tint = color
    bottomRight.tint = color
    top.tint = color
    left.tint = color
    right.tint = color
    bottom.tint = color
  }

  return {
    container,
    render,
  }
}