import gsap from 'gsap'
import { Container, Sprite } from 'pixi.js'
import { GraphState } from '@/models'
import { getRoundedBorderRectTextures } from '@/pixiFunctions'

export const roundedBorderRectAnimationDuration = 0.2
export const roundedBorderRectAnimationEase = 'power2.out'

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

type RoundedBorderRectResizeProps = {
  width: number,
  height: number,
  animate?: boolean,
}

type RoundedBorderRectProps = {
  graphState: GraphState,
  width: number,
  height: number,
  borderRadius: number,
  borderColor: number,
  borderWidth: number,
}

export class RoundedBorderRect extends Container {
  private readonly graphState
  private rectWidth
  private rectHeight
  private readonly borderRadius
  private readonly borderColor
  private readonly borderWidth

  public constructor({
    graphState,
    width,
    height,
    borderRadius,
    borderColor,
    borderWidth,
  }: RoundedBorderRectProps) {
    super()

    this.graphState = graphState
    this.rectWidth = width
    this.rectHeight = height

    this.borderRadius = borderRadius
    this.borderColor = borderColor
    this.borderWidth = borderWidth

    this.initRect()
  }

  private initRect(): void {
    const { borderRadius, borderColor, borderWidth } = this
    const { pixiApp } = this.graphState

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
    topEdge.height = borderWidth
    topEdge.name = rectElements.topEdge

    const rightEdge = new Sprite(edge)
    rightEdge.position.set(this.rectWidth - this.borderWidth, this.borderRadius)
    rightEdge.height = this.rectHeight - this.borderRadius * 2
    rightEdge.width = borderWidth
    rightEdge.name = rectElements.rightEdge

    const bottomEdge = new Sprite(edge)
    bottomEdge.position.set(this.borderRadius, this.rectHeight - this.borderWidth)
    bottomEdge.width = this.rectWidth - this.borderRadius * 2
    bottomEdge.height = borderWidth
    bottomEdge.name = rectElements.bottomEdge

    const leftEdge = new Sprite(edge)
    leftEdge.position.set(0, this.borderRadius)
    leftEdge.height = this.rectHeight - this.borderRadius * 2
    leftEdge.width = borderWidth
    leftEdge.name = rectElements.leftEdge

    this.addChild(topLeft)
    this.addChild(topRight)
    this.addChild(bottomRight)
    this.addChild(bottomLeft)

    this.addChild(topEdge)
    this.addChild(rightEdge)
    this.addChild(bottomEdge)
    this.addChild(leftEdge)

    this.resize({ width: this.rectWidth, height: this.rectHeight })
  }

  public resize({
    width,
    height,
    animate,
  }: RoundedBorderRectResizeProps): void {
    this.scale.x = 1
    this.rectWidth = width
    this.rectHeight = height

    const minRadiusWidth = this.borderRadius * 2
    const isWidthTooSmall = width < minRadiusWidth

    const adaptedWidth = isWidthTooSmall ? minRadiusWidth : width

    const topRight = this.getChildByName(rectElements.topRight) as Sprite
    const bottomRight = this.getChildByName(rectElements.bottomRight) as Sprite
    const bottomLeft = this.getChildByName(rectElements.bottomLeft) as Sprite

    const topEdge = this.getChildByName(rectElements.topEdge) as Sprite
    const rightEdge = this.getChildByName(rectElements.rightEdge) as Sprite
    const bottomEdge = this.getChildByName(rectElements.bottomEdge) as Sprite
    const leftEdge = this.getChildByName(rectElements.leftEdge) as Sprite

    if (width < minRadiusWidth) {
      this.scale.x = width / minRadiusWidth
    }

    if (!animate || this.graphState.suppressMotion.value) {
      topRight.position.x = adaptedWidth
      bottomRight.position.set(adaptedWidth, this.rectHeight)
      bottomLeft.position.y = this.rectHeight

      topEdge.width = adaptedWidth - minRadiusWidth
      rightEdge.height = this.rectHeight - minRadiusWidth
      rightEdge.position.x = adaptedWidth - this.borderWidth
      bottomEdge.width = adaptedWidth - minRadiusWidth
      bottomEdge.position.y = this.rectHeight - this.borderWidth
      leftEdge.height = this.rectHeight - minRadiusWidth
      return
    }

    const animationOptions = {
      duration: roundedBorderRectAnimationDuration,
      ease: roundedBorderRectAnimationEase,
    }

    gsap.to(topRight, { x: adaptedWidth, ...animationOptions })
    gsap.to(bottomRight, { x: adaptedWidth, y: this.rectHeight, ...animationOptions })
    gsap.to(bottomLeft, { y: this.rectHeight, ...animationOptions })

    gsap.to(topEdge, { width: adaptedWidth - minRadiusWidth, ...animationOptions })
    gsap.to(rightEdge, {
      height: this.rectHeight - minRadiusWidth,
      x: adaptedWidth - this.borderWidth,
      ...animationOptions,
    })
    gsap.to(bottomEdge, {
      width: adaptedWidth - minRadiusWidth,
      y: this.rectHeight - this.borderWidth,
      ...animationOptions,
    })
    gsap.to(leftEdge, { height: this.rectHeight - minRadiusWidth, ...animationOptions })
  }
}