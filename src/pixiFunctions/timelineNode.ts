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
}

export const nodeClickEvents = {
  nodeDetails: 'nodeDetailsClick',
  subNodesToggle: 'subNodesToggleClick',
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
  public readonly nodeData
  private readonly styles
  private readonly styleNode

  private currentState: string
  private readonly hasSubNodes: boolean = false
  private readonly unwatch: WatchStopHandle
  private apxLabelWidth = 0
  private nodeWidth
  private readonly nodeHeight
  private isLabelInBox = true

  private readonly boxCapWidth: number = 0
  private readonly box = new Container()

  private readonly labelContainer = new Container()
  private readonly subNodesToggleSize: number
  private readonly subNodesToggle: Container | undefined
  private label: BitmapText | undefined

  private subNodesContainer: Container | undefined
  private subNodesOutline: Graphics | undefined

  private readonly selectedRing = new Graphics()

  public constructor({
    appRef,
    nodeData,
    styles,
    styleNode,
  }: TimelineNodeProps) {
    super()
    this.appRef = appRef
    this.nodeData = nodeData
    this.styles = styles
    this.styleNode = styleNode

    this.currentState = nodeData.state
    this.hasSubNodes = nodeData.subFlowId !== undefined
    this.boxCapWidth = styles.value.borderRadiusNode

    this.nodeWidth = this.getNodeWidth()
    this.nodeHeight = this.getNodeHeight()

    this.initBox()

    this.subNodesToggleSize = this.nodeHeight
    this.drawLabel()

    this.drawSubNodesContainer()

    this.drawSelectedRing()
    this.selectedRing.alpha = 0

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

  private initBox(): void {
    const { box } = this
    box.name = timelineNodeBoxName
    this.drawBox()
    this.addChild(box)

    box.interactive = true
    box.buttonMode = true
    box.on('click', () => {
      this.emit(nodeClickEvents.nodeDetails, this.nodeData.id)
    })
  }

  private drawBox(): void {
    const { appRef, nodeWidth, nodeHeight, box, boxCapWidth } = this
    const { fill } = this.styleNode.value(this.nodeData)
    const hexadecimalFill = colorToHex(fill)
    const isRunningNode = !this.nodeData.end
    const {
      borderRadiusNode,
    } = this.styles.value

    this.box.removeChildren()

    const { cap, body } = getNodeBoxTextures({
      appRef,
      fill: hexadecimalFill,
      borderRadius: borderRadiusNode,
      boxCapWidth,
      height: nodeHeight,
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
      endCapSprite.position.set(nodeWidth, nodeHeight)

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

    if (this.hasSubNodes) {
      this.drawSubNodesToggle()
    }

    this.drawLabelText()

    this.updateLabelContainerPosition()

    this.addChild(this.labelContainer)
  }

  private setIsLabelInBox(): void {
    this.isLabelInBox = this.apxLabelWidth < this.nodeWidth
  }

  private async setApxLabelWidth(): Promise<void> {
    const { hasSubNodes, subNodesToggleSize } = this
    const { spacingNodeXPadding } = this.styles.value
    const { nodeTextStyles } = await getBitmapFonts(this.styles.value)
    const { label: labelText } = this.nodeData

    // the text metrics are consistently a bit off, so we add a buffer percentage
    const labelWidthBufferPercentage = 7
    const apxLabelTextWidth =
      TextMetrics.measureText(labelText, nodeTextStyles).width
      * (1 + labelWidthBufferPercentage / 100)

    const totalWidth = hasSubNodes
      ? subNodesToggleSize + spacingNodeXPadding + apxLabelTextWidth
      : apxLabelTextWidth
    const widthWithPadding = this.hasSubNodes
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
    const labelXPos = this.hasSubNodes
      ? this.subNodesToggleSize + spacingNodeXPadding
      : 0

    this.label?.destroy()

    this.label = new BitmapText(labelText, labelStyle)
    this.label.position.set(labelXPos, spacingNodeYPadding)

    if (!this.isLabelInBox) {
      this.label.interactive = true
      this.label.buttonMode = true
      this.label.on('click', () => {
        this.emit(nodeClickEvents.nodeDetails, this.nodeData.id)
      })
    }

    this.labelContainer.addChild(this.label)
  }

  private getNodeHeight(): number {
    const { textLineHeightDefault, spacingNodeYPadding } = this.styles.value
    return textLineHeightDefault + spacingNodeYPadding * 2
  }

  private drawSubNodesToggle(): void {
    let { subNodesToggle } = this
    const {
      subNodesToggleSize,
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

    subNodesToggle?.destroy()
    subNodesToggle = new Container()

    const subFlowBox = new Graphics()
    subFlowBox.lineStyle(1, colorButtonBorder)
    subFlowBox.beginFill(colorButtonBg)
    subFlowBox.drawRoundedRect(
      0,
      0,
      subNodesToggleSize,
      subNodesToggleSize,
      borderRadiusButton,
    )
    subFlowBox.endFill()
    subNodesToggle.addChild(subFlowBox)
    subFlowBox.alpha = isLabelInBox ? 0 : 1

    if (isLabelInBox) {
      const rightBorder = new Graphics()
      rightBorder.lineStyle(1, arrowColor)
      rightBorder.moveTo(subNodesToggleSize, 0)
      rightBorder.lineTo(subNodesToggleSize, subNodesToggleSize)
      subNodesToggle.addChild(rightBorder)
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
    arrowSprite.position.set(subNodesToggleSize / 2, subNodesToggleSize / 2)

    subNodesToggle.addChild(arrowSprite)

    labelContainer.addChild(subNodesToggle)

    subNodesToggle.interactive = true
    subNodesToggle.buttonMode = true
    subNodesToggle.on('click', () => {
      this.emit(nodeClickEvents.subNodesToggle, this.nodeData.id)
    })
  }

  private drawSubNodesContainer(): void {
    if (!this.hasSubNodes) {
      return
    }

    const { nodeWidth, nodeHeight } = this
    const {
      borderRadiusNode,
      alphaSubNodesOutlineDimmed,
      spacingSubNodesOutlineOffset,
    } = this.styles.value
    const { fill } = this.styleNode.value(this.nodeData)
    const hexadecimalFill = colorToHex(fill)

    if (!this.subNodesContainer) {
      this.subNodesContainer = new Container()
      this.addChild(this.subNodesContainer)
      this.subNodesOutline = new Graphics()
      this.subNodesContainer.addChild(this.subNodesOutline)
    }

    this.subNodesOutline!.clear()

    this.subNodesOutline!.lineStyle(1, hexadecimalFill)
    this.subNodesOutline!.drawRoundedRect(
      4,
      4,
      nodeWidth - spacingSubNodesOutlineOffset * 2,
      nodeHeight,
      borderRadiusNode,
    )
    this.subNodesOutline!.alpha = alphaSubNodesOutlineDimmed
  }

  private drawSelectedRing(): void {
    const { nodeHeight } = this
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
      nodeHeight + spacingNodeSelectionMargin * 2,
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
          child.position.set(this.nodeWidth, this.nodeHeight)
          break
        default:
          break
      }
    })

    if (this.subNodesOutline) {
      const { spacingSubNodesOutlineOffset } = this.styles.value
      this.subNodesOutline.width = this.nodeWidth - spacingSubNodesOutlineOffset * 2
    }
  }

  private updateLabelContainerPosition(): void {
    const {
      spacingNodeXPadding,
      spacingNodeLabelMargin,
    } = this.styles.value

    const inBoxXPos = this.hasSubNodes ? 0 : spacingNodeXPadding
    const xPos = this.isLabelInBox
      ? inBoxXPos
      : this.nodeWidth + spacingNodeLabelMargin

    this.labelContainer.position.set(xPos, 0)
  }

  public update(hasUpdatedData?: boolean): void {
    let hasNewState = false
    let hasNewLabelText = false


    if (hasUpdatedData) {
      hasNewState = this.currentState !== this.nodeData.state
      this.currentState = this.nodeData.state

      hasNewLabelText = this.label?.text !== this.nodeData.label
    }

    const nodeWidth = this.getNodeWidth()

    if (hasNewState) {
      this.drawBox()
      this.drawSubNodesContainer()
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
