import { BitmapText, Container, Graphics } from 'pixi.js'
import { getBitmapFonts } from './bitmapFonts'

const guideStyles = {
  guideLineColor: 0xc9d5e2,
  labelPadding: 4,
}

export class TimelineGuide extends Container {
  private readonly labelText: string | null
  private guideHeight: number

  private readonly guideLine: Graphics
  private label: BitmapText | undefined

  public constructor(labelText: string | null, guideHeight: number) {
    super()

    this.labelText = labelText
    this.guideHeight = guideHeight

    this.guideLine = new Graphics()
    this.drawGuideLine()
    this.addChild(this.guideLine)

    this.drawLabel()
  }

  private drawGuideLine(): void {
    this.guideLine.clear()
    this.guideLine.beginFill(guideStyles.guideLineColor)
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
      this.label.position.set(guideStyles.labelPadding, guideStyles.labelPadding)
      this.addChild(this.label)
    }
  }

  public updateHeight(guideHeight: number): void {
    this.guideHeight = guideHeight
    this.drawGuideLine()
  }
}
