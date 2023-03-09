import { Application, Container, Sprite } from 'pixi.js'
import { getRoundedBorderRectTextures } from '@/pixiFunctions'

type RoundedBorderRectProps = {
  pixiApp: Application,
  width: number,
  height: number,
  borderRadius: number,
  borderColor: number,
  borderWidth: number,
}

const rectElements = {
  topLeft: 'topLeft',
  topRight: 'topRight',
  bottomRight: 'bottomRight',
  bottomLeft: 'bottomLeft',
  topEdge: 'topEdge',
  rightEdge: 'rightEdge',
  bottomEdge: 'bottomEdge',
  leftEdge: 'leftEdge',
}

export class RoundedBorderRect extends Container {
  private readonly pixiApp
  private rectWidth
  private rectHeight
  private readonly borderRadius
  private readonly borderColor
  private readonly borderWidth

  public constructor({
    pixiApp,
    width,
    height,
    borderRadius,
    borderColor,
    borderWidth,
  }: RoundedBorderRectProps) {
    super()

    this.rectWidth = width
    this.rectHeight = height

    this.pixiApp = pixiApp
    this.borderRadius = borderRadius
    this.borderColor = borderColor
    this.borderWidth = borderWidth

    this.initRect()
  }

  private initRect(): void {
    const { pixiApp, borderRadius, borderColor, borderWidth } = this

    const { corner, edge } = getRoundedBorderRectTextures({
      pixiApp,
      borderRadius,
      borderColor,
      borderWidth,
    })

    const topLeft = new Sprite(corner)
    topLeft.name = rectElements.topLeft

    const topRight = new Sprite(corner)
    topRight.position.set(this.rectWidth, 0)
    topRight.rotation = Math.PI / 2
    topRight.name = rectElements.topRight

    const bottomRight = new Sprite(corner)
    bottomRight.position.set(this.rectWidth, this.rectHeight)
    bottomRight.rotation = Math.PI
    bottomRight.name = rectElements.bottomRight

    const bottomLeft = new Sprite(corner)
    bottomLeft.position.set(0, this.rectHeight)
    bottomLeft.rotation = Math.PI * 1.5
    bottomLeft.name = rectElements.bottomLeft

    const topEdge = new Sprite(edge)
    topEdge.position.set(this.borderRadius, 0)
    topEdge.width = this.rectWidth - this.borderRadius * 2
    topEdge.name = rectElements.topEdge

    const rightEdge = new Sprite(edge)
    rightEdge.position.set(this.rectWidth - this.borderWidth, this.borderRadius)
    rightEdge.height = this.rectHeight - this.borderRadius * 2
    rightEdge.name = rectElements.rightEdge

    const bottomEdge = new Sprite(edge)
    bottomEdge.position.set(this.borderRadius, this.rectHeight - this.borderWidth)
    bottomEdge.width = this.rectWidth - this.borderRadius * 2
    bottomEdge.name = rectElements.bottomEdge

    const leftEdge = new Sprite(edge)
    leftEdge.position.set(0, this.borderRadius)
    leftEdge.height = this.rectHeight - this.borderRadius * 2
    leftEdge.name = rectElements.leftEdge

    this.addChild(topLeft)
    this.addChild(topRight)
    this.addChild(bottomRight)
    this.addChild(bottomLeft)

    this.addChild(topEdge)
    this.addChild(rightEdge)
    this.addChild(bottomEdge)
    this.addChild(leftEdge)
  }

  public resize(width: number, height: number): void {
    this.rectWidth = width
    this.rectHeight = height

    const topRight = this.getChildByName(rectElements.topRight) as Sprite
    const bottomRight = this.getChildByName(rectElements.bottomRight) as Sprite
    const bottomLeft = this.getChildByName(rectElements.bottomLeft) as Sprite

    const topEdge = this.getChildByName(rectElements.topEdge) as Sprite
    const rightEdge = this.getChildByName(rectElements.rightEdge) as Sprite
    const bottomEdge = this.getChildByName(rectElements.bottomEdge) as Sprite
    const leftEdge = this.getChildByName(rectElements.leftEdge) as Sprite

    topRight.position.set(this.rectWidth, 0)
    bottomRight.position.set(this.rectWidth, this.rectHeight)
    bottomLeft.position.set(0, this.rectHeight)

    topEdge.width = this.rectWidth - this.borderRadius * 2
    rightEdge.height = this.rectHeight - this.borderRadius * 2
    rightEdge.position.x = this.rectWidth - this.borderWidth
    bottomEdge.width = this.rectWidth - this.borderRadius * 2
    bottomEdge.position.y = this.rectHeight - this.borderWidth
    leftEdge.height = this.rectHeight - this.borderRadius * 2
  }
}