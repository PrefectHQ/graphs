import { BitmapText, Container, Graphics } from 'pixi.js'
import { ComputedRef } from 'vue'
import { ParsedThemeStyles } from '@/models'
import { getBitmapFonts } from '@/pixiFunctions/bitmapFonts'

type TimelineGuideProps = {
  labelText: string | null,
  styles: ComputedRef<ParsedThemeStyles>,
  appHeight: number,
}

export class TimelineGuide extends Container {
  private readonly labelText
  private readonly styles
  private appHeight

  private readonly guideLine = new Graphics()
  private label: BitmapText | undefined

  public constructor({
    labelText,
    styles,
    appHeight,
  }: TimelineGuideProps) {
    super()

    this.labelText = labelText
    this.styles = styles
    this.appHeight = appHeight

    this.drawGuideLine()
    this.addChild(this.guideLine)

    this.drawLabel()

    this.interactive = false
  }

  private drawGuideLine(): void {
    const { colorGuideLine } = this.styles.value

    this.guideLine.clear()
    this.guideLine.beginFill(colorGuideLine)
    this.guideLine.drawRect(
      0,
      0,
      1,
      this.appHeight,
    )
    this.guideLine.endFill()
  }

  private async drawLabel(): Promise<void> {
    if (this.labelText) {
      const textStyles = await getBitmapFonts(this.styles.value)
      const { spacingGuideLabelPadding } = this.styles.value

      this.label?.destroy()
      this.label = new BitmapText(this.labelText, textStyles.timeMarkerLabel)
      this.label.position.set(
        spacingGuideLabelPadding,
        spacingGuideLabelPadding,
      )
      this.addChild(this.label)
    }
  }

  public updateHeight(appHeight: number): void {
    this.appHeight = appHeight
    this.drawGuideLine()
  }
}
