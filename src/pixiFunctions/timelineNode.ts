import gsap from 'gsap'
import {
  Application,
  BitmapText,
  Container,
  Graphics,
  Sprite,
  TextMetrics
} from 'pixi.js'
import { ComputedRef, watch, WatchStopHandle } from 'vue'
import {
  ParsedThemeStyles,
  TimelineNodeData,
  NodeThemeFn
} from '@/models'
import {
  getBitmapFonts,
  timelineScale,
  getNodeBoxTextures,
  getArrowTexture
} from '@/pixiFunctions'
import { colorToHex } from '@/utilities/style'

type TimelineNodeProps = {
  appRef: Application,
  nodeData: TimelineNodeData,
  styles: ComputedRef<ParsedThemeStyles>,
  styleNode: ComputedRef<NodeThemeFn>,
  layoutPosition: number,
}

type UpdateTimelineNodeOptions = {
  newNodeData?: TimelineNodeData,
  animate?: boolean,
}

export const nodeClickEvents = {
  nodeDetails: 'nodeDetailsClick',
  subFlowToggle: 'subFlowToggleClick',
}

export const nodeAnimationDurations = {
  fadeIn: 0.25,
  move: 0.5,
}

// The name giving to the box container, this is used by
// edges to determine their positions
export const timelineNodeBoxName = 'box'

const nodeBoxSpriteNames = {
  startCap: 'startCap',
  endCap: 'endCap',
  body: 'body',
}

export class TimelineNode extends Container {
  private readonly appRef: Application
  public nodeData
  private readonly styles
  private readonly styleNode

  private readonly isSubFlow: boolean = false
  private readonly unwatch: WatchStopHandle

  private readonly labelContainer = new Container()
  private readonly subFlowToggleSize: number
  private readonly subFlowToggle: Container | undefined
  private label: BitmapText | undefined

  private readonly boxCapWidth: number = 0
  private readonly box = new Container()

  private apxLabelWidth = 0
  private nodeWidth
  private readonly layoutPositionOffset
  public layoutPosition
  private isLabelInBox = true

  private readonly selectedRing = new Graphics()

  public constructor({
    appRef,
    nodeData,
    styles,
    styleNode,
    layoutPosition,
  }: TimelineNodeProps) {
    super()
    this.appRef = appRef
    this.nodeData = nodeData
    this.styles = styles
    this.styleNode = styleNode
    this.layoutPosition = layoutPosition

    this.isSubFlow = nodeData.subFlowId !== undefined
    this.boxCapWidth = styles.value.borderRadiusNode

    this.nodeWidth = this.getNodeWidth()
    this.layoutPositionOffset = this.getLayoutPositionOffset()

    this.initBox()

    this.subFlowToggleSize = this.getSubFlowToggleSize()
    this.drawLabel()

    this.drawSelectedRing()
    this.selectedRing.alpha = 0

    this.updatePosition()

    this.unwatch = watch([styles, styleNode], () => {
      this.drawBox()
      this.drawLabel()
    }, { deep: true })

    this.interactive = false
  }

  private getNodeWidth(): number {
    const minimumWidth = this.boxCapWidth * 2
    const actualWidth = timelineScale.dateToX(this.nodeData.end ?? new Date()) - timelineScale.dateToX(this.nodeData.start)

    return actualWidth > minimumWidth ? actualWidth : minimumWidth
  }

  private getLayoutPositionOffset(): number {
    const { textLineHeightDefault, spacingNodeYPadding, spacingNodeMargin } = this.styles.value
    const nodeHeight = textLineHeightDefault + spacingNodeYPadding * 2

    return nodeHeight + spacingNodeMargin
  }

  private initBox(): void {
    const { box } = this
    box.name = timelineNodeBoxName
    this.drawBox()
    this.addChild(box)

    box.interactive = true
    box.buttonMode = true
    box.on('click', () => {
      this.emit(nodeClickEvents.nodeDetails)
    })
  }

  private drawBox(): void {
    const { appRef, nodeWidth, box, boxCapWidth } = this
    const { fill } = this.styleNode.value(this.nodeData)
    const hexadecimalFill = colorToHex(fill)
    const isRunningNode = !this.nodeData.end
    const {
      textLineHeightDefault,
      spacingNodeYPadding,
      borderRadiusNode,
    } = this.styles.value

    const height = textLineHeightDefault + spacingNodeYPadding * 2

    this.box.removeChildren()

    const { cap, body } = getNodeBoxTextures({
      appRef,
      fill: hexadecimalFill,
      borderRadius: borderRadiusNode,
      boxCapWidth,
      height,
    })

    const startCapSprite = new Sprite(cap)
    startCapSprite.name = nodeBoxSpriteNames.startCap

    const bodySprite = new Sprite(body)
    bodySprite.name = nodeBoxSpriteNames.body
    bodySprite.width = this.getBoxBodyWidth()
    bodySprite.position.set(boxCapWidth, 0)

    box.addChild(startCapSprite)
    box.addChild(bodySprite)

    if (!isRunningNode) {
      const endCapSprite = new Sprite(cap)
      endCapSprite.name = nodeBoxSpriteNames.endCap
      endCapSprite.rotation = Math.PI
      endCapSprite.position.set(nodeWidth, height)

      box.addChild(endCapSprite)
    }
  }

  private getBoxBodyWidth(): number {
    const { nodeData, nodeWidth, boxCapWidth } = this
    const isRunningNode = !nodeData.end
    return isRunningNode
      ? nodeWidth - boxCapWidth
      : nodeWidth - boxCapWidth * 2
  }

  private async drawLabel(): Promise<void> {
    this.labelContainer.removeChildren()

    await this.setApxLabelWidth()
    this.setIsLabelInBox()

    if (this.isSubFlow) {
      this.drawSubFlowToggle()
    }

    this.drawLabelText()

    this.updateLabelContainerPosition()

    this.addChild(this.labelContainer)
  }

  private setIsLabelInBox(): void {
    this.isLabelInBox = this.apxLabelWidth < this.nodeWidth
  }

  private async setApxLabelWidth(): Promise<void> {
    const { isSubFlow, subFlowToggleSize } = this
    const { spacingNodeXPadding } = this.styles.value
    const { nodeTextStyles } = await getBitmapFonts(this.styles.value)
    const { label: labelText } = this.nodeData

    // the text metrics are consistently a bit off, so we add a buffer percentage
    const labelWidthBufferPercentage = 7
    const apxLabelTextWidth =
      TextMetrics.measureText(labelText, nodeTextStyles).width
      * (1 + labelWidthBufferPercentage / 100)

    const totalWidth = isSubFlow
      ? subFlowToggleSize + spacingNodeXPadding + apxLabelTextWidth
      : apxLabelTextWidth
    const widthWithPadding = this.isSubFlow
      ? totalWidth + spacingNodeXPadding
      : totalWidth + spacingNodeXPadding * 2

    this.apxLabelWidth = widthWithPadding
  }

  private async drawLabelText(): Promise<void> {
    const textStyles = await getBitmapFonts(this.styles.value)
    const { spacingNodeYPadding, spacingNodeXPadding } = this.styles.value
    const { inverseTextOnFill } = this.styleNode.value(this.nodeData)
    const labelStyleOnFill = inverseTextOnFill ? textStyles.nodeTextInverse : textStyles.nodeTextDefault

    const { label: labelText } = this.nodeData
    const labelStyle = this.isLabelInBox ? labelStyleOnFill : textStyles.nodeTextDefault
    const labelXPos = this.isSubFlow
      ? this.subFlowToggleSize + spacingNodeXPadding
      : 0

    this.label?.destroy()

    this.label = new BitmapText(labelText, labelStyle)
    this.label.position.set(labelXPos, spacingNodeYPadding)

    if (!this.isLabelInBox) {
      this.label.interactive = true
      this.label.buttonMode = true
      this.label.on('click', () => {
        this.emit(nodeClickEvents.nodeDetails)
      })
    }

    this.labelContainer.addChild(this.label)
  }

  private getSubFlowToggleSize(): number {
    const { textLineHeightDefault, spacingNodeYPadding } = this.styles.value
    return textLineHeightDefault + spacingNodeYPadding * 2
  }

  private drawSubFlowToggle(): void {
    let { subFlowToggle } = this
    const {
      subFlowToggleSize,
      isLabelInBox,
      labelContainer,
    } = this
    const { inverseTextOnFill } = this.styleNode.value(this.nodeData)
    const {
      colorTextDefault,
      colorTextInverse,
      colorButtonBorder,
      colorButtonBg,
      borderRadiusButton,
    } = this.styles.value
    const arrowColorOnFill = inverseTextOnFill ? colorTextInverse : colorTextDefault
    const arrowColor = isLabelInBox ? arrowColorOnFill : colorTextDefault

    subFlowToggle?.destroy()
    subFlowToggle = new Container()

    const subFlowBox = new Graphics()
    subFlowBox.lineStyle(1, colorButtonBorder)
    subFlowBox.beginFill(colorButtonBg)
    subFlowBox.drawRoundedRect(
      0,
      0,
      subFlowToggleSize,
      subFlowToggleSize,
      borderRadiusButton,
    )
    subFlowBox.endFill()
    subFlowToggle.addChild(subFlowBox)
    subFlowBox.alpha = isLabelInBox ? 0 : 1

    if (isLabelInBox) {
      const rightBorder = new Graphics()
      rightBorder.lineStyle(1, arrowColor)
      rightBorder.moveTo(subFlowToggleSize, 0)
      rightBorder.lineTo(subFlowToggleSize, subFlowToggleSize)
      subFlowToggle.addChild(rightBorder)
    }

    const arrowTexture = getArrowTexture({
      appRef: this.appRef,
      strokeColor: arrowColor,
      edgeWidth: 2,
      edgeLength: 8,
    })

    const arrowSprite = new Sprite(arrowTexture)
    arrowSprite.transform.rotation = Math.PI / 2
    arrowSprite.anchor.set(0.5, 0.5)
    arrowSprite.position.set(subFlowToggleSize / 2, subFlowToggleSize / 2)

    subFlowToggle.addChild(arrowSprite)

    labelContainer.addChild(subFlowToggle)

    subFlowToggle.interactive = true
    subFlowToggle.buttonMode = true
    subFlowToggle.on('click', () => {
      this.emit(nodeClickEvents.subFlowToggle)
    })
  }

  private drawSelectedRing(): void {
    const {
      colorNodeSelection,
      spacingNodeSelectionMargin,
      spacingNodeSelectionWidth,
      borderRadiusNode,
    } = this.styles.value

    this.selectedRing.clear()

    this.selectedRing.lineStyle(
      spacingNodeSelectionWidth,
      colorNodeSelection,
      1,
      1,
    )
    this.selectedRing.drawRoundedRect(
      -spacingNodeSelectionMargin,
      -spacingNodeSelectionMargin,
      this.nodeWidth + spacingNodeSelectionMargin * 2,
      this.box.height + spacingNodeSelectionMargin * 2,
      borderRadiusNode,
    )

    this.addChild(this.selectedRing)
  }

  private updateBoxWidth(): void {
    this.box.children.forEach((child) => {
      const childName = child.name
      switch (childName) {
        case nodeBoxSpriteNames.body:
          child.scale.x = this.getBoxBodyWidth()
          break
        case nodeBoxSpriteNames.endCap:
          child.position.set(this.nodeWidth, this.box.height)
          break
        default:
          break
      }
    })
  }

  public async updatePosition(animate?: boolean): Promise<void> {
    const xPos = timelineScale.dateToX(this.nodeData.start)
    const yPos = this.layoutPosition * this.layoutPositionOffset

    if (!animate) {
      this.position.set(xPos, yPos)
      return
    }

    await new Promise((resolve) => {
      gsap.to(this, {
        x: xPos,
        y: yPos,
        duration: nodeAnimationDurations.move,
        ease: 'power1.out',
      }).then(() => {
        resolve(null)
      })
    })
  }

  private updateLabelContainerPosition(): void {
    const {
      spacingNodeXPadding,
      spacingNodeLabelMargin,
    } = this.styles.value

    const inBoxXPos = this.isSubFlow ? 0 : spacingNodeXPadding
    const xPos = this.isLabelInBox
      ? inBoxXPos
      : this.nodeWidth + spacingNodeLabelMargin

    this.labelContainer.position.set(xPos, 0)
  }

  public async update(options?: UpdateTimelineNodeOptions): Promise<void> {
    const { newNodeData, animate } = options ?? {}
    let hasNewState = false
    let hasNewLabelText = false

    if (newNodeData) {
      hasNewState = newNodeData.state !== this.nodeData.state
      hasNewLabelText = this.label?.text !== newNodeData.label

      this.nodeData = newNodeData
    }

    const nodeWidth = this.getNodeWidth()

    if (hasNewState) {
      this.drawBox()
    }

    if (hasNewLabelText) {
      this.drawLabel()
    }

    if (nodeWidth !== this.nodeWidth) {
      this.nodeWidth = nodeWidth

      this.updateBoxWidth()

      this.drawSelectedRing()

      // 2px tolerance avoids the label bouncing in/out of the box
      const isLabelInBoxChanged = this.isLabelInBox && this.apxLabelWidth > this.nodeWidth + 2
        || !this.isLabelInBox && this.apxLabelWidth < this.nodeWidth - 2

      if (!hasNewLabelText && isLabelInBoxChanged) {
        this.drawLabel()
      } else if (!this.isLabelInBox) {
        this.updateLabelContainerPosition()
      }
    }

    await this.updatePosition(animate)
  }

  public select(): void {
    this.selectedRing.alpha = 1
  }

  public deselect(): void {
    this.selectedRing.alpha = 0
  }

  public destroy(): void {
    this.unwatch()
    super.destroy.call(this)
  }
}
