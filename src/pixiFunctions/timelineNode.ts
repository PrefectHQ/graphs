import { BitmapText, Container, Graphics, TextMetrics } from 'pixi.js'
import { getBitmapFonts } from './bitmapFonts'
import { TimelineNodeData } from '@/models'

const nodeStyles = {
  padding: 16,
  borderRadius: 8,
  labelGap: 4,
}

const stateColors: Record<string, number> = {
  'completed': 0x00a63d,
  'running': 0x00a8ef,
  'scheduled': 0x60758d,
  'pending': 0x60758d,
  'failed': 0xf00011,
  'cancelled': 0xf00011,
  'crashed': 0xf00011,
  'paused': 0xf4b000,
}

export class TimelineNode extends Container {
  public nodeData: TimelineNodeData
  private readonly xScale: (date: Date) => number

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

    this.nodeWidth = this.getNodeWidth()

    this.drawLabel()

    this.box = new Graphics()
    this.drawBox()
    this.addChild(this.box)

    this.updatePosition()
  }

  private getNodeWidth(): number {
    return this.xScale(this.nodeData.end ?? new Date()) - this.xScale(this.nodeData.start)
  }

  private async drawLabel(): Promise<void> {
    const textStyles = await getBitmapFonts()

    if (this.apxLabelWidth === 0) {
      this.apxLabelWidth = TextMetrics.measureText(this.nodeData.label, textStyles.nodeTextMetrics).width
    }

    this.label?.destroy()

    if (this.apxLabelWidth > this.nodeWidth) {
      this.isLabelInBox = false
      this.label = new BitmapText(this.nodeData.label, textStyles.nodeTextDefault)
    } else {
      this.isLabelInBox = true
      this.label = new BitmapText(this.nodeData.label, textStyles.nodeTextInverse)
    }

    this.label.position.set(
      this.isLabelInBox ? nodeStyles.padding : this.nodeWidth + nodeStyles.labelGap,
      nodeStyles.padding,
    )

    this.addChild(this.label)
  }

  private get boxColor(): number {
    return this.nodeData.state ? stateColors[this.nodeData.state] : stateColors.pending
  }

  private drawBox(): void {
    this.box.beginFill(this.boxColor)
    this.box.drawRoundedRect(
      0,
      0,
      this.nodeWidth,
      (this.label?.height ? this.label.height : 32) + nodeStyles.padding * 2,
      nodeStyles.borderRadius,
    )
    this.box.endFill()
  }

  private updatePosition(): void {
    this.position.set(
      this.xScale(this.nodeData.start),
      this.yPositionIndex * 120,
    )
  }

  public update(): void {
    const nodeWidth = this.getNodeWidth()

    if (nodeWidth !== this.nodeWidth) {
      this.nodeWidth = nodeWidth

      this.box.clear()
      this.drawBox()

      if (!this.isLabelInBox || this.apxLabelWidth > this.nodeWidth) {
        this.drawLabel()
      }
    }

    this.updatePosition()
  }
}
