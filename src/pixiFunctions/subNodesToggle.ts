import gsap from 'gsap'
import { Container, Sprite } from 'pixi.js'
import { watch, WatchStopHandle } from 'vue'
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

  private isExpanded = false
  private textColor: number

  private readonly toggleBox = new Container()
  private readonly hoverShade = new Container()
  private toggleArrow: Sprite | undefined
  private toggleBorder: RoundedBorderRect | undefined
  private divider: Sprite | undefined

  private readonly unWatchers: WatchStopHandle[] = []

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

    this.initShapes()

    this.on('pointerover', () => {
      this.hover()
    })
    this.on('pointerout', () => {
      this.unHover()
    })

    this.initWatchers()
  }

  private initWatchers(): void {
    const { viewport, styleOptions, styleNode } = this.graphState

    this.unWatchers.push(
      watch([styleOptions, styleNode], () => {
        this.toggleBox.removeChildren()
        this.hoverShade.removeChildren()
        this.toggleArrow?.destroy()
        this.toggleBorder?.destroy()
        this.divider?.destroy()

        this.textColor = this.getTextColor()
        this.initShapes()
      }, { deep: true }),
    )

    viewport.on('frame-end', () => {
      if (viewport.scale.x < 0.2) {
        this.visible = false
      } else {
        this.visible = true
      }
    })
  }

  private initShapes(): void {
    this.initToggleBox()
    this.initHoverShade()
    this.hoverShade.alpha = 0
    this.initDivider()
    this.initToggleArrow()
    this.initToggleBorder()
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

  private initHoverShade(): void {
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

  private initDivider(): void {
    const { size, textColor, floating } = this
    const { pixiApp } = this.graphState

    const fillTexture = getSimpleFillTexture({
      pixiApp,
      fill: textColor,
    })

    this.divider = new Sprite(fillTexture)
    this.divider.width = 1
    this.divider.height = size
    this.divider.x = size

    if (floating) {
      this.divider.alpha = 0
    }

    this.addChild(this.divider)
  }

  private initToggleArrow(): void {
    const { size, textColor, isExpanded } = this
    const { pixiApp } = this.graphState

    const arrowTexture = getArrowTexture({
      pixiApp,
      strokeColor: textColor,
      edgeWidth: 2,
      edgeLength: 8,
    })

    this.toggleArrow = new Sprite(arrowTexture)
    this.toggleArrow.transform.rotation = isExpanded ? Math.PI / 2 * -1 : Math.PI / 2
    this.toggleArrow.anchor.set(0.5, 0.5)
    this.toggleArrow.position.set(size / 2, size / 2)

    this.addChild(this.toggleArrow)
  }

  private initToggleBorder(): void {
    const { size, floating } = this
    const { pixiApp, styleOptions } = this.graphState
    const {
      colorButtonBorder,
      borderRadiusButton,
      spacingButtonBorderWidth,
    } = styleOptions.value

    this.toggleBorder = new RoundedBorderRect({
      pixiApp,
      width: size,
      height: size,
      borderRadius: borderRadiusButton,
      borderWidth: spacingButtonBorderWidth,
      borderColor: colorButtonBorder,
    })

    if (!floating) {
      this.toggleBorder.alpha = 0
    }

    this.addChild(this.toggleBorder)
  }

  private setToggleArrowRotation(rotation: number): void {
    const { suppressMotion } = this.graphState

    if (!this.toggleArrow) {
      return
    }

    gsap.to(this.toggleArrow, {
      rotation,
      duration: suppressMotion.value ? 0 : 0.2,
      ease: 'power2.inOut',
    })
  }

  private getTextColor(): number {
    const { floating, inverseTextOnFill } = this
    const { colorTextDefault, colorTextInverse } = this.graphState.styleOptions.value

    const colorOnFill = inverseTextOnFill ? colorTextInverse : colorTextDefault

    return floating ? colorTextDefault : colorOnFill
  }

  private hover(): void {
    this.hoverShade.alpha = 1
  }

  private unHover(): void {
    this.hoverShade.alpha = 0
  }

  public setExpanded(): void {
    this.isExpanded = true
    this.setToggleArrowRotation(Math.PI / 2 * -1)
  }

  public setCollapsed(): void {
    this.isExpanded = false
    this.setToggleArrowRotation(Math.PI / 2)
  }

  public destroy(): void {
    this.graphState.cull.remove(this)
    super.destroy.call(this)
  }
}