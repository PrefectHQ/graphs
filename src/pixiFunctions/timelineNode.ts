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
  getNodeBoxTextures
} from '@/pixiFunctions'
import { colorToHex } from '@/utilities/style'

type TimelineNodeProps = {
  appRef: Application,
  nodeData: TimelineNodeData,
  styles: ComputedRef<ParsedThemeStyles>,
  styleNode: ComputedRef<NodeThemeFn>,
  layoutPosition: number,
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

    this.box.name = timelineNodeBoxName
    this.drawBox()
    this.addChild(this.box)

    this.drawLabel()

    this.drawSelectedRing()
    this.selectedRing.alpha = 0

    this.updatePosition(true)

    this.unwatch = watch([styles, styleNode], () => {
      this.box.removeChildren()
      this.drawBox()
      this.drawLabel()
    }, { deep: true })

    this.interactive = true
    this.buttonMode = true

    this.animateIn()
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
    const textStyles = await getBitmapFonts(this.styles.value)
    const { label, subFlowLabel } = this.nodeData
    const { inverseTextOnFill } = this.styleNode.value(this.nodeData)
    const { spacingNodeXPadding } = this.styles.value

    const labelText = this.isSubFlow && subFlowLabel ? subFlowLabel : label

    if (this.apxLabelWidth === 0 || this.label?.text !== labelText) {
      // the text metrics are consistently a bit off, so we add a buffer percentage
      const labelWidthBufferPercentage = 7
      this.apxLabelWidth =
        TextMetrics.measureText(labelText, textStyles.nodeTextStyles).width
        * (1 + labelWidthBufferPercentage / 100)
    }

    this.label?.destroy()

    if (this.apxLabelWidth + spacingNodeXPadding * 2 > this.nodeWidth) {
      this.isLabelInBox = false
      this.label = new BitmapText(labelText, textStyles.nodeTextDefault)
    } else {
      const styleForLabelInBox = inverseTextOnFill ? textStyles.nodeTextInverse : textStyles.nodeTextDefault
      this.isLabelInBox = true
      this.label = new BitmapText(labelText, styleForLabelInBox)
    }

    this.updateLabelPosition()

    this.addChild(this.label)
  }

  private drawSelectedRing(): void {
    const {
      colorNodeSelection,
      spacingNodeSelectionMargin,
      spacingNodeSelectionWidth,
      borderRadiusNode,
    } = this.styles.value

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

  private animateIn(): void {
    gsap.to(this, { alpha: 1, duration: nodeAnimationDurations.fadeIn })
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

  public async updatePosition(skipAnimation?: boolean): Promise<void> {
    const xPos = timelineScale.dateToX(this.nodeData.start)
    const yPos = this.layoutPosition * this.layoutPositionOffset

    if (skipAnimation) {
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

  private updateLabelPosition(): void {
    const {
      spacingNodeXPadding,
      spacingNodeYPadding,
      spacingNodeLabelMargin,
    } = this.styles.value

    this.label?.position.set(
      this.isLabelInBox
        ? spacingNodeXPadding
        : this.nodeWidth + spacingNodeLabelMargin,
      spacingNodeYPadding,
    )
  }

  public async update(newNodeData?: TimelineNodeData): Promise<void> {
    let hasNewState = false
    const hasNewLabelText = this.isSubFlow
      && this.nodeData.subFlowLabel
      && this.label?.text !== this.nodeData.subFlowLabel

    if (newNodeData) {
      hasNewState = newNodeData.state !== this.nodeData.state
      this.nodeData = newNodeData
    }

    const nodeWidth = this.getNodeWidth()

    if (hasNewState) {
      this.box.removeChildren()
      this.drawBox()
    }

    if (hasNewLabelText) {
      this.drawLabel()
    }

    if (nodeWidth !== this.nodeWidth) {
      if (!hasNewState) {
        this.updateBoxWidth()
      }

      this.nodeWidth = nodeWidth

      this.selectedRing.clear()
      this.drawSelectedRing()

      // 2px tolerance avoids the label bouncing in/out of the box
      const isLabelInBoxChanged = this.isLabelInBox && this.apxLabelWidth > this.nodeWidth + 2
        || !this.isLabelInBox && this.apxLabelWidth < this.nodeWidth - 2

      if (!hasNewLabelText && isLabelInBoxChanged) {
        this.drawLabel()
      } else if (!this.isLabelInBox) {
        this.updateLabelPosition()
      }
    }

    await this.updatePosition()
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
