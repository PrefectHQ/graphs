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
  getArrowTexture,
  TimelineNodes
} from '@/pixiFunctions'
import { RoundedBorderRect } from '@/pixiFunctions/roundedBorderRect'
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

  private isSubNodesExpanded = false
  private subNodesWrapper: Container | undefined
  private subNodesOutline: RoundedBorderRect | undefined
  private subNodesContent: Container | undefined
  private subNodesHeight = 0
  private subNodesContentTicker: (() => void) | null = null

  private readonly selectedRing: RoundedBorderRect

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

    this.initSubNodesOutline()

    this.selectedRing = this.initSelectedRing()
    this.selectedRing.alpha = 0
    this.addChild(this.selectedRing)

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

  private initSubNodesOutline(): void {
    if (!this.hasSubNodes) {
      return
    }

    if (!this.subNodesWrapper) {
      this.subNodesWrapper = new Container()
      this.addChild(this.subNodesWrapper)
    }

    this.subNodesOutline?.destroy()

    const { nodeWidth, nodeHeight } = this
    const {
      borderRadiusNode,
      alphaSubNodesOutlineDimmed,
      spacingSubNodesOutlineBorderWidth,
      spacingSubNodesOutlineOffset,
    } = this.styles.value
    const { fill } = this.styleNode.value(this.nodeData)
    const outlineColor = colorToHex(fill)

    this.subNodesOutline = new RoundedBorderRect({
      appRef: this.appRef,
      width: nodeWidth - spacingSubNodesOutlineOffset * 2,
      height: nodeHeight,
      borderRadius: borderRadiusNode,
      borderWidth: spacingSubNodesOutlineBorderWidth,
      borderColor: outlineColor,
    })
    this.subNodesOutline.position.set(
      spacingSubNodesOutlineOffset,
      spacingSubNodesOutlineOffset,
    )
    this.subNodesOutline.alpha = alphaSubNodesOutlineDimmed
    this.subNodesWrapper!.addChild(this.subNodesOutline)
  }

  private updateSubNodesOutlineSize(): void {
    if (!this.subNodesOutline) {
      return
    }

    const {
      isSubNodesExpanded,
      subNodesContent,
      subNodesOutline,
      nodeWidth,
      nodeHeight,
    } = this
    const {
      spacingSubNodesOutlineOffset,
      alphaSubNodesOutlineDimmed,
      spacingNodeLabelMargin,
    } = this.styles.value

    if (isSubNodesExpanded) {
      subNodesOutline.position.set(-spacingSubNodesOutlineOffset, -spacingSubNodesOutlineOffset)
      subNodesOutline.alpha = 1
    } else {
      subNodesOutline.position.set(spacingSubNodesOutlineOffset, spacingSubNodesOutlineOffset)
      subNodesOutline.alpha = alphaSubNodesOutlineDimmed
    }

    const width = isSubNodesExpanded
      ? nodeWidth + spacingSubNodesOutlineOffset * 2
      : nodeWidth - spacingSubNodesOutlineOffset * 2
    const height = isSubNodesExpanded
      ? nodeHeight + subNodesContent!.height + spacingNodeLabelMargin
      : nodeHeight

    subNodesOutline.resize(width, height)
  }

  private initSelectedRing(): RoundedBorderRect {
    const { width, height, margin } = this.getUpdateSelectedRingSize()
    const {
      colorNodeSelection,
      spacingNodeSelectionWidth,
      borderRadiusNode,
    } = this.styles.value

    const newSelectedRing = new RoundedBorderRect({
      appRef: this.appRef,
      width,
      height,
      borderRadius: borderRadiusNode,
      borderColor: colorNodeSelection,
      borderWidth: spacingNodeSelectionWidth,
    })
    newSelectedRing.position.set(-margin, -margin)

    return newSelectedRing
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

  private getUpdateSelectedRingSize(): { width: number, height: number, margin: number } {
    const {
      spacingNodeSelectionMargin,
      spacingNodeSelectionWidth,
      spacingSubNodesOutlineBorderWidth,
      spacingSubNodesOutlineOffset,
    } = this.styles.value

    // The margin compensates for RoundedBorderRect using an inset border
    const margin = spacingNodeSelectionMargin + spacingNodeSelectionWidth

    const width = this.nodeWidth + margin * 2
    const height = this.hasSubNodes && !this.subNodesContent
      ? this.nodeHeight + spacingSubNodesOutlineBorderWidth + spacingSubNodesOutlineOffset + margin * 2
      : this.nodeHeight + margin * 2

    return { width, height, margin }
  }

  private updateSelectedRingSize(): void {
    const { width, height } = this.getUpdateSelectedRingSize()
    this.selectedRing.resize(width, height)
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
      this.initSubNodesOutline()
    }

    if (hasNewLabelText) {
      this.drawLabel()
    }

    if (nodeWidth !== this.nodeWidth) {
      this.nodeWidth = nodeWidth

      this.updateBoxWidth()
      this.updateSelectedRingSize()
      if (this.subNodesOutline) {
        this.updateSubNodesOutlineSize()
      }

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

  public expandSubNodes(subNodes: TimelineNodes): void {
    if (!this.hasSubNodes || !this.subNodesWrapper) {
      return
    }

    // update trigger.
    // handle loading

    if (!this.subNodesContent || this.subNodesContent.destroyed) {
      this.createSubNodesContentContainer()
    }

    this.updateSubNodesOffsetPosition(subNodes)
    subNodes.on('updated', () => this.updateSubNodesOffsetPosition(subNodes))

    this.subNodesContent!.addChild(subNodes)

    this.isSubNodesExpanded = true
    this.initSubNodesTicker(subNodes)
  }

  public updateSubNodesOffsetPosition(subNodes: TimelineNodes): void {
    // The subNodes nodes are positioned relative to the global timeline, but we're drawing
    // the subNodes container relative to this node, so we need to offset the X to compensate.
    const earliestSubNodes = subNodes.getEarliestNodeStart()
    const xPosNegativeOffset = earliestSubNodes ? -timelineScale.dateToX(earliestSubNodes) : 0
    subNodes.position.x = xPosNegativeOffset
  }

  private initSubNodesTicker(subNodes: TimelineNodes): void {
    this.subNodesHeight = subNodes.height

    this.subNodesContentTicker = () => {
      if (this.subNodesContent?.height !== this.subNodesHeight) {
        this.updateSubNodesOutlineSize()
        this.updateSelectedRingSize()
        this.subNodesHeight = subNodes.height
      }
    }
    this.appRef.ticker.add(this.subNodesContentTicker)
  }

  public collapseSubNodes(): void {
    this.isSubNodesExpanded = false

    this.destroySubNodesContent()

    this.updateSubNodesOutlineSize()
    this.updateSelectedRingSize()
  }

  private createSubNodesContentContainer(): void {
    if (!this.subNodesWrapper) {
      console.warn('FlowRunTimeline: node cannot create subNodesContent without subNodesWrapper')
      return
    }

    const {
      spacingNodeMargin,
      spacingSubNodesOutlineOffset,
    } = this.styles.value

    this.subNodesContent = new Container()
    this.subNodesContent.position.set(
      this.box.x,
      this.box.y + this.box.height + spacingNodeMargin - spacingSubNodesOutlineOffset,
    )

    this.subNodesWrapper.addChild(this.subNodesContent)
  }

  private destroySubNodesContent(): void {
    if (this.subNodesContentTicker) {
      this.appRef.ticker.remove(this.subNodesContentTicker)
      this.subNodesContentTicker = null
    }

    this.subNodesContent?.getChildAt(0)?.destroy()
    this.subNodesContent?.destroy()
  }

  public destroy(): void {
    this.box.destroy()

    this.label?.destroy()
    this.subNodesToggle?.destroy()
    this.labelContainer.destroy()

    this.destroySubNodesContent()
    this.subNodesOutline?.destroy()
    this.subNodesWrapper?.destroy()

    this.selectedRing.destroy()

    this.unwatch()
    super.destroy.call(this)
  }
}
