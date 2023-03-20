import gsap from 'gsap'
import { Container, Sprite } from 'pixi.js'
import { GraphState } from '@/models'
import { getRoundedBorderRectTextures } from '@/pixiFunctions'

export const roundedBorderRectAnimationDuration = 0.2
export const roundedBorderRectAnimationEase = 'power2.out'

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

  private topLeft: Sprite | undefined
  private topRight: Sprite | undefined
  private bottomRight: Sprite | undefined
  private bottomLeft: Sprite | undefined
  private topEdge: Sprite | undefined
  private rightEdge: Sprite | undefined
  private bottomEdge: Sprite | undefined
  private leftEdge: Sprite | undefined

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

    this.topLeft = new Sprite(corner)

    this.topRight = new Sprite(corner)
    this.topRight.position.set(this.rectWidth, 0)
    this.topRight.rotation = Math.PI / 2

    this.bottomRight = new Sprite(corner)
    this.bottomRight.position.set(this.rectWidth, this.rectHeight)
    this.bottomRight.rotation = Math.PI

    this.bottomLeft = new Sprite(corner)
    this.bottomLeft.position.set(0, this.rectHeight)
    this.bottomLeft.rotation = Math.PI * 1.5

    this.topEdge = new Sprite(edge)
    this.topEdge.position.set(this.borderRadius, 0)
    this.topEdge.width = this.rectWidth - this.borderRadius * 2
    this.topEdge.height = borderWidth

    this.rightEdge = new Sprite(edge)
    this.rightEdge.position.set(this.rectWidth - this.borderWidth, this.borderRadius)
    this.rightEdge.height = this.rectHeight - this.borderRadius * 2
    this.rightEdge.width = borderWidth

    this.bottomEdge = new Sprite(edge)
    this.bottomEdge.position.set(this.borderRadius, this.rectHeight - this.borderWidth)
    this.bottomEdge.width = this.rectWidth - this.borderRadius * 2
    this.bottomEdge.height = borderWidth

    this.leftEdge = new Sprite(edge)
    this.leftEdge.position.set(0, this.borderRadius)
    this.leftEdge.height = this.rectHeight - this.borderRadius * 2
    this.leftEdge.width = borderWidth

    this.addChild(this.topLeft)
    this.addChild(this.topRight)
    this.addChild(this.bottomRight)
    this.addChild(this.bottomLeft)

    this.addChild(this.topEdge)
    this.addChild(this.rightEdge)
    this.addChild(this.bottomEdge)
    this.addChild(this.leftEdge)

    this.resize({ width: this.rectWidth, height: this.rectHeight })
  }

  public resize({
    width,
    height,
    animate,
  }: RoundedBorderRectResizeProps): void {
    const {
      topRight,
      bottomRight,
      bottomLeft,
      topEdge,
      rightEdge,
      bottomEdge,
      leftEdge,
    } = this
    this.scale.x = 1
    this.rectWidth = width
    this.rectHeight = height

    const minRadiusWidth = this.borderRadius * 2
    const isWidthTooSmall = width < minRadiusWidth

    const adaptedWidth = isWidthTooSmall ? minRadiusWidth : width

    if (width < minRadiusWidth) {
      this.scale.x = width / minRadiusWidth
    }

    if (!animate || this.graphState.suppressMotion.value) {
      topRight!.position.x = adaptedWidth
      bottomRight!.position.set(adaptedWidth, this.rectHeight)
      bottomLeft!.position.y = this.rectHeight

      topEdge!.width = adaptedWidth - minRadiusWidth
      rightEdge!.height = this.rectHeight - minRadiusWidth
      rightEdge!.position.x = adaptedWidth - this.borderWidth
      bottomEdge!.width = adaptedWidth - minRadiusWidth
      bottomEdge!.position.y = this.rectHeight - this.borderWidth
      leftEdge!.height = this.rectHeight - minRadiusWidth
      return
    }

    const animationOptions = {
      duration: roundedBorderRectAnimationDuration,
      ease: roundedBorderRectAnimationEase,
    }

    gsap.to(topRight!, { x: adaptedWidth, ...animationOptions })
    gsap.to(bottomRight!, { x: adaptedWidth, y: this.rectHeight, ...animationOptions })
    gsap.to(bottomLeft!, { y: this.rectHeight, ...animationOptions })

    gsap.to(topEdge!, { width: adaptedWidth - minRadiusWidth, ...animationOptions })
    gsap.to(rightEdge!, {
      height: this.rectHeight - minRadiusWidth,
      x: adaptedWidth - this.borderWidth,
      ...animationOptions,
    })
    gsap.to(bottomEdge!, {
      width: adaptedWidth - minRadiusWidth,
      y: this.rectHeight - this.borderWidth,
      ...animationOptions,
    })
    gsap.to(leftEdge!, { height: this.rectHeight - minRadiusWidth, ...animationOptions })
  }

  private killTweens(): void {
    const {
      topRight,
      bottomRight,
      bottomLeft,
      topEdge,
      rightEdge,
      bottomEdge,
      leftEdge,
    } = this
    gsap.killTweensOf([
      topRight,
      bottomRight,
      bottomLeft,
      topEdge,
      rightEdge,
      bottomEdge,
      leftEdge,
    ])
  }

  public destroy(): void {
    this.killTweens()
    super.destroy.call(this)
  }
}