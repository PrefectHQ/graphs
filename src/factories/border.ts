import { ColorSource, Container, Sprite, Texture } from 'pixi.js'
import { CornerStyle, getCornerTexture } from '@/textures/corner'
import { getPixelTexture } from '@/textures/pixel'

export type BorderStyle = {
  width: number,
  height: number,
  stroke: number,
  radius?: number,
  color?: ColorSource,
  roundedTop?: boolean,
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

  topLeft.name = 'border-corner-top-left'
  topRight.name = 'border-corner-top-right'
  bottomLeft.name = 'border-corner-bottom-left'
  bottomRight.name = 'border-corner-bottom-right'
  left.name = 'border-corner-left'
  right.name = 'border-corner-right'
  top.name = 'border-corner-top'
  bottom.name = 'border-corner-bottom'

  topRight.anchor.x = 1
  topRight.scale.x = -1
  bottomLeft.anchor.y = 1
  bottomLeft.scale.y = -1
  bottomRight.anchor.x = 1
  bottomRight.scale.x = -1
  bottomRight.anchor.y = 1
  bottomRight.scale.y = -1

  container.addChild(topLeft)
  container.addChild(topRight)
  container.addChild(bottomLeft)
  container.addChild(bottomRight)
  container.addChild(left)
  container.addChild(right)
  container.addChild(top)
  container.addChild(bottom)

  async function render(style: BorderStyle): Promise<Container> {
    const { radius = 0, color = '#fff', stroke, width, height, roundedTop } = style
    const maxSize = Math.min(width, height)
    const size = radius * 2 > maxSize ? maxSize / 2 : radius

    const cornerStyle: CornerStyle = {
      size,
      radius,
      stroke,
    }

    const corner = await getCornerTexture(cornerStyle)
    const pixel = await getPixelTexture()

    updateCorners({
      texture: corner,
      width,
      height,
      size,
      roundedTop,
    })

    updateBorders({
      texture: pixel,
      width,
      height,
      size,
      stroke,
      roundedTop,
    })

    setTint(color)

    return container
  }

  type UpdateCorners = {
    texture: Texture,
    width: number,
    height: number,
    size: number,
    roundedTop?: boolean,
  }

  function updateCorners({ texture, width, height, size, roundedTop }: UpdateCorners): void {
    if (roundedTop) {
      bottomLeft.visible = false
      bottomRight.visible = false
    } else {
      bottomLeft.visible = true
      bottomRight.visible = true
    }

    topLeft.texture = texture
    topRight.texture = texture
    bottomLeft.texture = texture
    bottomRight.texture = texture

    topLeft.position.set(0, 0)
    topRight.position.set(width - size, 0)
    bottomLeft.position.set(0, height - size)
    bottomRight.position.set(width - size, height - size)
  }

  type UpdateBorders = {
    texture: Texture,
    width: number,
    height: number,
    size: number,
    stroke: number,
    roundedTop?: boolean,
  }

  function updateBorders({ texture, size, width, height, stroke, roundedTop }: UpdateBorders): void {
    const sidesHeight = Math.max(height - size * 2, 0)
    const topAndBottomWidth = Math.max(width - size * 2, 0)

    top.texture = texture
    left.texture = texture
    right.texture = texture
    bottom.texture = texture

    left.position.set(0, size)
    left.height = roundedTop ? Math.max(height - size, 0) : sidesHeight
    left.width = stroke

    right.position.set(width - stroke, size)
    right.height = roundedTop ? Math.max(height - size, 0) : sidesHeight
    right.width = stroke

    top.position.set(size, 0)
    top.width = topAndBottomWidth
    top.height = stroke

    bottom.position.set(roundedTop ? 0 : size, height - stroke)
    bottom.width = roundedTop ? Math.max(width, 0) : topAndBottomWidth
    bottom.height = stroke
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
    element: container,
    render,
  }
}