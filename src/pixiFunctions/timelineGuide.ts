import { BitmapText, Container, Graphics } from 'pixi.js'
import { getBitmapFonts } from './bitmapFonts'
import { getTimelineStyles } from './timelineStyles'

export class TimelineGuide extends Container {
  private readonly labelText: string | null
  private guideHeight: number

  private readonly guideLine: Graphics
  private label: BitmapText | undefined

  private readonly guideLineColor: number
  private readonly labelPadding: number

  public constructor(labelText: string | null, guideHeight: number) {
    super()

    this.labelText = labelText
    this.guideHeight = guideHeight

    const { guideLineColor, labelPadding } = this.getStyles()
    this.guideLineColor = guideLineColor
    this.labelPadding = labelPadding

    this.guideLine = new Graphics()
    this.drawGuideLine()
    this.addChild(this.guideLine)

    this.drawLabel()
  }

  private getStyles(): { guideLineColor: number, labelPadding: number } {
    const timelineStyles = getTimelineStyles()
    const guideLineColor = Number(timelineStyles.get('--gt-color-guide-line') ?? 0xc9d5e2)
    const labelPadding = Number(timelineStyles.get('--gt-spacing-guide-label-padding') ?? 4)

    return { guideLineColor, labelPadding }
  }

  private drawGuideLine(): void {
    this.guideLine.clear()
    this.guideLine.beginFill(this.guideLineColor)
    this.guideLine.drawRect(
      0,
      0,
      1,
      this.guideHeight,
    )
    this.guideLine.endFill()
  }

  private async drawLabel(): Promise<void> {
    if (this.labelText) {
      const textStyles = await getBitmapFonts()

      this.label?.destroy()
      this.label = new BitmapText(this.labelText, textStyles.timeMarkerLabel)
      this.label.position.set(this.labelPadding, this.labelPadding)
      this.addChild(this.label)
    }
  }

  public updateHeight(guideHeight: number): void {
    this.guideHeight = guideHeight
    this.drawGuideLine()
  }
}
