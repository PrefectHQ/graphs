import gsap from 'gsap'
import { Container, Sprite } from 'pixi.js'
import { watch, WatchStopHandle } from 'vue'
import { GraphState, GraphTimelineNode } from '@/models'
import {
  getArrowTexture,
  getNodeBoxTextures,
  getSimpleFillTexture,
  RoundedBorderRect
} from '@/pixiFunctions'
import { colorToHex } from '@/utilities'

const hoverShadePieces = {
  leftCap: 'leftCap',
  body: 'body',
  rightCap: 'rightCap',
}

const toggleAnimationDuration = 0.2
// At which scale does the toggle become too hard to see and doesn't need to be drawn.
const toggleScaleCullingThreshold = 0.2

type SubNodesToggleProps = {
  graphState: GraphState,
  nodeData: GraphTimelineNode,
  size: number,
  floating?: boolean,
}

export class SubNodesToggle extends Container {
  private readonly graphState
  private readonly nodeData
  private readonly size

  private isFloating
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
    nodeData,
    size,
    floating,
  }: SubNodesToggleProps) {
    super()

    this.interactive = true
    this.buttonMode = true
    graphState.cull.add(this)

    this.graphState = graphState
    this.nodeData = nodeData
    this.size = size
    this.isFloating = floating

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
        this.redraw()
      }, { deep: true }),
    )

    viewport.on('frame-end', () => {
      if (viewport.scale.x < toggleScaleCullingThreshold) {
        this.visible = false
      } else {
        this.visible = true
      }
    })
  }

  private initShapes(): void {
    this.initToggleBox()
    this.initHoverShade()
    this.initDivider()
    this.initToggleArrow()
    this.initToggleBorder()
  }

  private initToggleBox(): void {
    const { size, toggleBox, isFloating } = this
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

    if (!isFloating) {
      // box is transparent rather than hidden so that it still defines the clickable area.
      toggleBox.alpha = 0
    }

    this.addChild(toggleBox)
  }

  private initHoverShade(): void {
    const {
      hoverShade,
      size,
      isFloating,
    } = this
    const {
      borderRadiusButton,
      colorButtonBgHover,
    } = this.graphState.styleOptions.value
    const {
      onFillSubNodeToggleHoverBg,
      onFillSubNodeToggleHoverBgAlpha,
    } = this.graphState.styleNode.value(this.nodeData)
    const nonFloatingHoverBg = colorToHex(onFillSubNodeToggleHoverBg)

    hoverShade.removeChildren()

    const { cap, body } = getNodeBoxTextures({
      pixiApp: this.graphState.pixiApp,
      fill: isFloating ? colorButtonBgHover : nonFloatingHoverBg,
      borderRadius: borderRadiusButton,
      boxCapWidth: borderRadiusButton,
      height: size,
    })

    const leftCap = new Sprite(cap)
    leftCap.name = hoverShadePieces.leftCap
    leftCap.alpha = isFloating ? 1 : onFillSubNodeToggleHoverBgAlpha

    const bodySprite = new Sprite(body)
    bodySprite.name = hoverShadePieces.body
    bodySprite.x = borderRadiusButton
    bodySprite.width = isFloating
      ? size - borderRadiusButton * 2
      : size - borderRadiusButton
    bodySprite.height = size
    bodySprite.alpha = isFloating ? 1 : onFillSubNodeToggleHoverBgAlpha

    const rightCap = new Sprite(cap)
    rightCap.name = hoverShadePieces.rightCap
    rightCap.scale.x = -1
    rightCap.x = size
    rightCap.alpha = isFloating ? 1 : 0

    hoverShade.addChild(leftCap)
    hoverShade.addChild(bodySprite)
    hoverShade.addChild(rightCap)

    hoverShade.alpha = 0

    this.addChild(hoverShade)
  }

  private initDivider(): void {
    const { size, textColor, isFloating } = this
    const { pixiApp } = this.graphState

    const fillTexture = getSimpleFillTexture({
      pixiApp,
      fill: textColor,
    })

    this.divider = new Sprite(fillTexture)
    this.divider.width = 1
    this.divider.height = size
    this.divider.x = size

    if (isFloating) {
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
    const { size, isFloating } = this
    const {
      colorButtonBorder,
      borderRadiusButton,
      spacingButtonBorderWidth,
    } = this.graphState.styleOptions.value

    if (!colorButtonBorder) {
      return
    }

    this.toggleBorder = new RoundedBorderRect({
      graphState: this.graphState,
      width: size,
      height: size,
      borderRadius: borderRadiusButton,
      borderWidth: spacingButtonBorderWidth,
      borderColor: colorButtonBorder,
    })

    if (!isFloating) {
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
      duration: suppressMotion.value ? 0 : toggleAnimationDuration,
      ease: 'power2.inOut',
    })
  }

  private getTextColor(): number {
    const { styleOptions, styleNode } = this.graphState
    const { colorTextDefault, colorTextInverse } = styleOptions.value
    const { inverseTextOnFill } = styleNode.value(this.nodeData)

    const colorOnFill = inverseTextOnFill ? colorTextInverse : colorTextDefault

    return this.isFloating ? colorTextDefault : colorOnFill
  }

  private redraw(): void {
    this.toggleBox.removeChildren()
    this.hoverShade.removeChildren()
    this.toggleArrow?.destroy()
    this.toggleBorder?.destroy()
    this.divider?.destroy()

    this.textColor = this.getTextColor()
    this.initShapes()
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

  public updateFloatingState(value: boolean): void {
    if (this.isFloating === value) {
      return
    }

    this.isFloating = value
    this.redraw()
  }

  public destroy(): void {
    this.graphState.cull.remove(this)
    super.destroy.call(this)
  }
}
