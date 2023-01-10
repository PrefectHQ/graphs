import { BitmapText, Container, Graphics, TextMetrics } from 'pixi.js'
import { getBitmapFonts } from './bitmapFonts'
import { getTimelineStyles } from './timelineStyles'
import { TimelineNodeData } from '@/models'

export class TimelineNode extends Container {
  public nodeData: TimelineNodeData
  private readonly xScale: (date: Date) => number

  private readonly stateColors: Record<string, number>
  private readonly padding: number
  private readonly borderRadius: number
  private readonly labelGap: number
  private readonly lineHeight: number

  private label: BitmapText | undefined
  private readonly box: Graphics

  private apxLabelWidth: number = 0
  private nodeWidth
  private readonly yPositionIndex: number = 0
  private isLabelInBox = true

  public constructor(
    nodeData: TimelineNodeData,
    xScale: (date: Date) => number,
    yPositionIndex: number,
  ) {
    super()

    this.nodeData = nodeData
    this.xScale = xScale
    this.yPositionIndex = yPositionIndex

    const {
      stateColors,
      padding,
      borderRadius,
      labelGap,
      lineHeight,
    } = this.getStyles()
    this.stateColors = stateColors
    this.padding = padding
    this.borderRadius = borderRadius
    this.labelGap = labelGap
    this.lineHeight = lineHeight

    this.nodeWidth = this.getNodeWidth()

    this.box = new Graphics()
    this.drawBox()
    this.addChild(this.box)

    this.drawLabel()

    this.updatePosition()
  }

  private getStyles(): {
    stateColors: Record<string, number>,
    padding: number,
    borderRadius: number,
    labelGap: number,
    lineHeight: number,
  } {
    const timelineStyles = getTimelineStyles()

    const stateColors = {
      'completed': Number(timelineStyles.get('--gt-color-state-completed') ?? 0x00a63d),
      'running': Number(timelineStyles.get('--gt-color-state-running') ?? 0x00a8ef),
      'scheduled': Number(timelineStyles.get('--gt-color-state-scheduled') ?? 0x60758d),
      'pending': Number(timelineStyles.get('--gt-color-state-pending') ?? 0x60758d),
      'failed': Number(timelineStyles.get('--gt-color-state-failed') ?? 0xf00011),
      'cancelled': Number(timelineStyles.get('--gt-color-state-cancelled') ?? 0xf00011),
      'crashed': Number(timelineStyles.get('--gt-color-state-crashed') ?? 0xf00011),
      'paused': Number(timelineStyles.get('--gt-color-state-paused') ?? 0xf4b000),
    }

    const padding = Number(timelineStyles.get('--gt-spacing-node-padding') ?? 12)
    const borderRadius = Number(timelineStyles.get('--gt-border-radius') ?? 8)
    const labelGap = Number(timelineStyles.get('--gt-spacing-node-margin') ?? 8)

    const fontSizeDefault = Number(timelineStyles.get('--gt-text-size-default') ?? 16)
    const lineHeight = Number(timelineStyles.get('--gt-text-line-height-small') ?? 1.25) * fontSizeDefault

    return { stateColors, padding, borderRadius, labelGap, lineHeight }
  }

  private getNodeWidth(): number {
    return this.xScale(this.nodeData.end ?? new Date()) - this.xScale(this.nodeData.start)
  }

  private get boxColor(): number {
    return this.nodeData.state ? this.stateColors[this.nodeData.state] : this.stateColors.pending
  }

  private drawBox(): void {
    this.box.beginFill(this.boxColor)
    this.box.drawRoundedRect(
      0,
      0,
      this.nodeWidth,
      this.lineHeight + this.padding * 2,
      this.borderRadius,
    )
    this.box.endFill()
  }

  private async drawLabel(): Promise<void> {
    const textStyles = await getBitmapFonts()

    if (this.apxLabelWidth === 0) {
      this.apxLabelWidth = TextMetrics.measureText(this.nodeData.label, textStyles.nodeTextBaseStyle).width
    }

    this.label?.destroy()

    if (this.apxLabelWidth + this.padding * 2 > this.nodeWidth) {
      this.isLabelInBox = false
      this.label = new BitmapText(this.nodeData.label, textStyles.nodeTextDefault)
    } else {
      this.isLabelInBox = true
      this.label = new BitmapText(this.nodeData.label, textStyles.nodeTextInverse)
    }

    this.updateLabelPosition()

    this.addChild(this.label)
  }

  private updatePosition(): void {
    this.position.set(
      this.xScale(this.nodeData.start),
      this.yPositionIndex * (this.lineHeight + this.padding * 2 + 16),
    )
  }

  private updateLabelPosition(): void {
    this.label?.position.set(
      this.isLabelInBox ? this.padding : this.nodeWidth + this.labelGap,
      this.padding,
    )
  }

  public update(): void {
    const nodeWidth = this.getNodeWidth()

    if (nodeWidth !== this.nodeWidth) {
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
