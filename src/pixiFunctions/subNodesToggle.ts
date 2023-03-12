import { Container, Sprite } from 'pixi.js'
import { GraphState } from '@/models'
import {
  getArrowTexture,
  getNodeBoxTextures,
  getSimpleFillTexture,
  RoundedBorderRect
} from '@/pixiFunctions'

const hoverShadePieces = {
  leftCap: 'leftCap',
  body: 'body',
  rightCap: 'rightCap',
}

type SubNodesToggleProps = {
  graphState: GraphState,
  size: number,
  nonFloatingHoverBg: number,
  nonFloatingHoverAlpha: number,
  floating?: boolean,
  inverseTextOnFill?: boolean,
}

export class SubNodesToggle extends Container {
  private readonly graphState
  private readonly size
  private readonly nonFloatingHoverBg
  private readonly nonFloatingHoverAlpha
  private readonly floating
  private readonly inverseTextOnFill

  private readonly textColor: number

  private readonly toggleBox = new Container()
  private readonly hoverShade = new Container()
  private readonly toggleArrow: Sprite
  private readonly toggleBorder: RoundedBorderRect
  private readonly divider: Sprite

  public constructor({
    graphState,
    size,
    nonFloatingHoverBg,
    nonFloatingHoverAlpha,
    floating,
    inverseTextOnFill,
  }: SubNodesToggleProps) {
    super()

    this.interactive = true
    this.buttonMode = true
    graphState.cull.add(this)

    this.graphState = graphState
    this.size = size
    this.nonFloatingHoverBg = nonFloatingHoverBg
    this.nonFloatingHoverAlpha = nonFloatingHoverAlpha
    this.floating = floating
    this.inverseTextOnFill = inverseTextOnFill

    this.textColor = this.getTextColor()

    this.initToggleBox()
    this.drawHoverShade()
    this.hoverShade.alpha = 0
    this.divider = this.drawDivider()
    this.addChild(this.divider)
    this.toggleArrow = this.drawToggleArrow()
    this.addChild(this.toggleArrow)
    this.toggleBorder = this.drawToggleBorder()
    this.addChild(this.toggleBorder)

    this.on('pointerover', () => {
      this.hover()
    })
    this.on('pointerout', () => {
      this.unHover()
    })
  }

  private getTextColor(): number {
    const { floating, inverseTextOnFill } = this
    const { colorTextDefault, colorTextInverse } = this.graphState.styleOptions.value

    const colorOnFill = inverseTextOnFill ? colorTextInverse : colorTextDefault

    return floating ? colorOnFill : colorTextDefault
  }

  private initToggleBox(): void {
    const { size, toggleBox, floating } = this
    const { pixiApp, styleOptions } = this.graphState

    const { colorButtonBg, borderRadiusButton } = styleOptions.value

    const { cap, body } = getNodeBoxTextures({
      pixiApp,
      fill: colorButtonBg,
      borderRadius: borderRadiusButton,
      boxCapWidth: borderRadiusButton,
      height: size,
    })

    const bgLeftCap = new Sprite(cap)

    const bgBody = new Sprite(body)
    bgBody.x = borderRadiusButton
    bgBody.width = size - borderRadiusButton * 2
    bgBody.height = size

    const bgRightCap = new Sprite(cap)
    bgRightCap.scale.x = -1
    bgRightCap.x = size

    toggleBox.addChild(bgLeftCap)
    toggleBox.addChild(bgBody)
    toggleBox.addChild(bgRightCap)

    if (!floating) {
      // box is transparent rather than hidden so that it still defines the clickable area.
      toggleBox.alpha = 0
    }

    this.addChild(toggleBox)
  }

  private drawHoverShade(): void {
    const {
      hoverShade,
      nonFloatingHoverBg,
      nonFloatingHoverAlpha,
      size,
      floating,
    } = this
    const { borderRadiusButton, colorButtonBgHover } = this.graphState.styleOptions.value

    hoverShade.removeChildren()

    const { cap, body } = getNodeBoxTextures({
      pixiApp: this.graphState.pixiApp,
      fill: floating ? colorButtonBgHover : nonFloatingHoverBg,
      borderRadius: borderRadiusButton,
      boxCapWidth: borderRadiusButton,
      height: size,
    })

    const leftCap = new Sprite(cap)
    leftCap.name = hoverShadePieces.leftCap
    leftCap.alpha = floating ? 1 : nonFloatingHoverAlpha

    const bodySprite = new Sprite(body)
    bodySprite.name = hoverShadePieces.body
    bodySprite.x = borderRadiusButton
    bodySprite.width = floating
      ? size - borderRadiusButton * 2
      : size - borderRadiusButton
    bodySprite.height = size
    bodySprite.alpha = floating ? 1 : nonFloatingHoverAlpha

    const rightCap = new Sprite(cap)
    rightCap.name = hoverShadePieces.rightCap
    rightCap.scale.x = -1
    rightCap.x = size
    rightCap.alpha = floating ? 1 : 0

    hoverShade.addChild(leftCap)
    hoverShade.addChild(bodySprite)
    hoverShade.addChild(rightCap)

    this.addChild(hoverShade)
  }

  private drawDivider(): Sprite {
    const { size, textColor, floating } = this
    const { pixiApp } = this.graphState

    const fillTexture = getSimpleFillTexture({
      pixiApp,
      fill: textColor,
    })

    const divider = new Sprite(fillTexture)
    divider.width = 1
    divider.height = size
    divider.x = size

    if (floating) {
      divider.alpha = 0
    }

    return divider
  }

  private drawToggleArrow(): Sprite {
    const { size, textColor } = this
    const { pixiApp } = this.graphState

    const arrowTexture = getArrowTexture({
      pixiApp,
      strokeColor: textColor,
      edgeWidth: 2,
      edgeLength: 8,
    })

    const arrowSprite = new Sprite(arrowTexture)
    arrowSprite.transform.rotation = Math.PI / 2
    arrowSprite.anchor.set(0.5, 0.5)
    arrowSprite.position.set(size / 2, size / 2)

    return arrowSprite
  }

  private drawToggleBorder(): RoundedBorderRect {
    const { size, floating } = this
    const { pixiApp, styleOptions } = this.graphState
    const {
      colorButtonBorder,
      borderRadiusButton,
      spacingButtonBorderWidth,
    } = styleOptions.value

    const border = new RoundedBorderRect({
      pixiApp,
      width: size,
      height: size,
      borderRadius: borderRadiusButton,
      borderWidth: spacingButtonBorderWidth,
      borderColor: colorButtonBorder,
    })

    if (!floating) {
      border.alpha = 0
    }

    return border
  }

  private hover(): void {
    this.hoverShade.alpha = 1
  }

  private unHover(): void {
    this.hoverShade.alpha = 0
  }

  public destroy(): void {
    this.graphState.cull.remove(this)
    super.destroy.call(this)
  }
}
