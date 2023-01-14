import { BitmapText, Container, Graphics } from 'pixi.js'
import { ComputedRef } from 'vue'
import { getBitmapFonts } from './bitmapFonts'
import { ParsedThemeStyles } from '@/models'

type TimelineGuideProps = {
  labelText: string | null,
  styles: ComputedRef<ParsedThemeStyles>,
  appHeight: number,
}

export class TimelineGuide extends Container {
  private readonly labelText: string | null
  private readonly styles: ComputedRef<ParsedThemeStyles>
  private appHeight: number

  private readonly guideLine: Graphics
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

    this.guideLine = new Graphics()
    this.drawGuideLine()
    this.addChild(this.guideLine)

    this.drawLabel()
  }

  private drawGuideLine(): void {
    this.guideLine.clear()
    this.guideLine.beginFill(this.styles.value.colorGuideLine)
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

      this.label?.destroy()
      this.label = new BitmapText(this.labelText, textStyles.timeMarkerLabel)
      this.label.position.set(
        this.styles.value.spacingGuideLabelPadding,
        this.styles.value.spacingGuideLabelPadding,
      )
      this.addChild(this.label)
    }
  }

  public updateHeight(appHeight: number): void {
    this.appHeight = appHeight
    this.drawGuideLine()
  }
}
