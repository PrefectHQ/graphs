import { BitmapText, Container, Graphics, TextMetrics } from 'pixi.js'
import { ComputedRef } from 'vue'
import { getBitmapFonts } from './bitmapFonts'
import {
  ParsedThemeStyles,
  TimelineNodeData,
  NodeThemeFn,
  XScale
} from '@/models'
import { colorToHex } from '@/utilities/style'

type TimelineNodeProps = {
  nodeData: TimelineNodeData,
  xScale: XScale,
  styles: ComputedRef<ParsedThemeStyles>,
  styleNode: ComputedRef<NodeThemeFn>,
  yPositionIndex: number,
}

export class TimelineNode extends Container {
  public nodeData
  private readonly xScale
  private readonly styles
  private readonly styleNode

  private label: BitmapText | undefined
  private readonly box: Graphics

  private apxLabelWidth = 0
  private nodeWidth
  private readonly yPositionOffset
  private readonly yPositionIndex
  private isLabelInBox = true


  public constructor({
    nodeData,
    xScale,
    styles,
    styleNode,
    yPositionIndex,
  }: TimelineNodeProps) {
    super()
    this.nodeData = nodeData
    this.xScale = xScale
    this.styles = styles
    this.styleNode = styleNode
    this.yPositionIndex = yPositionIndex

    this.nodeWidth = this.getNodeWidth()

    this.yPositionOffset = this.getYPositionOffset(styles.value)

    this.box = new Graphics()
    this.drawBox()
    this.addChild(this.box)

    this.drawLabel()

    this.updatePosition()
  }

  private getNodeWidth(): number {
    return this.xScale(this.nodeData.end ?? new Date()) - this.xScale(this.nodeData.start)
  }

  private getYPositionOffset(styles: ParsedThemeStyles): number {
    const nodeHeight = styles.textLineHeightDefault + styles.spacingNodeYPadding * 2
    return nodeHeight + styles.spacingNodeMargin
  }

  private drawBox(): void {
    const { fill } = this.styleNode.value(this.nodeData)
    const hexadecimalFill = colorToHex(fill)
    const {
      textLineHeightDefault,
      spacingNodeYPadding,
      borderRadiusNode,
    } = this.styles.value

    const width = this.nodeWidth >= 1 ? this.nodeWidth : 1
    const height = textLineHeightDefault + spacingNodeYPadding * 2

    this.box.beginFill(hexadecimalFill)
    this.box.drawRoundedRect(
      0,
      0,
      width,
      height,
      borderRadiusNode,
    )
    this.box.endFill()
  }

  private async drawLabel(): Promise<void> {
    const textStyles = await getBitmapFonts(this.styles.value)
    const { inverseTextOnFill } = this.styleNode.value(this.nodeData)
    const { spacingNodeXPadding } = this.styles.value

    if (this.apxLabelWidth === 0) {
      this.apxLabelWidth = TextMetrics.measureText(this.nodeData.label, textStyles.nodeTextStyles).width
    }

    this.label?.destroy()

    if (this.apxLabelWidth + spacingNodeXPadding * 2 > this.nodeWidth) {
      this.isLabelInBox = false
      this.label = new BitmapText(this.nodeData.label, textStyles.nodeTextDefault)
    } else {
      const styleForLabelInBox = inverseTextOnFill ? textStyles.nodeTextInverse : textStyles.nodeTextDefault
      this.isLabelInBox = true
      this.label = new BitmapText(this.nodeData.label, styleForLabelInBox)
    }

    this.updateLabelPosition()

    this.addChild(this.label)
  }

  private updatePosition(): void {
    this.position.set(
      this.xScale(this.nodeData.start),
      this.yPositionIndex * this.yPositionOffset,
    )
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

  public update(newNodeData?: TimelineNodeData): void {
    let hasNewState = false

    if (newNodeData) {
      hasNewState = newNodeData.state !== this.nodeData.state
      this.nodeData = newNodeData
    }

    const nodeWidth = this.getNodeWidth()

    if (nodeWidth !== this.nodeWidth || hasNewState) {
      this.nodeWidth = nodeWidth

      this.box.clear()
      this.drawBox()

      if (
        // 2px tolerance avoids the label bouncing in/out of the box
        this.isLabelInBox && this.apxLabelWidth > this.nodeWidth + 2
        || !this.isLabelInBox && this.apxLabelWidth < this.nodeWidth - 2
      ) {
        this.drawLabel()
      } else if (!this.isLabelInBox) {
        this.updateLabelPosition()
      }
    }

    this.updatePosition()
  }
}
