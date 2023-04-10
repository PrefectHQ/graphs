import { Application, BitmapText, Container, Sprite } from 'pixi.js'
import { ComputedRef } from 'vue'
import { ParsedThemeStyles } from '@/models'
import { getBitmapFonts } from '@/pixiFunctions/bitmapFonts'
import { getSimpleFillTexture } from '@/pixiFunctions/nodeSprites'

type TimelineGuideProps = {
  pixiApp: Application,
  labelText: string | null,
  styleOptions: ComputedRef<ParsedThemeStyles>,
}

export class TimelineGuide extends Container {
  private readonly pixiApp
  private readonly labelText
  private readonly styleOptions

  private guideLine: Sprite | undefined
  private label: BitmapText | undefined

  public constructor({
    pixiApp,
    labelText,
    styleOptions,
  }: TimelineGuideProps) {
    super()

    this.pixiApp = pixiApp
    this.labelText = labelText
    this.styleOptions = styleOptions

    this.initGuideLine()
    this.drawLabel()

    this.interactive = false
  }

  private initGuideLine(): void {
    const { pixiApp } = this
    const { colorGuideLine } = this.styleOptions.value

    const texture = getSimpleFillTexture({
      pixiApp: pixiApp,
      fill: colorGuideLine,
    })

    this.guideLine = new Sprite(texture)
    this.guideLine.width = 1
    this.guideLine.height = pixiApp.screen.height
    this.addChild(this.guideLine)
  }

  private async drawLabel(): Promise<void> {
    if (this.labelText) {
      const textStyles = await getBitmapFonts(this.styleOptions.value)
      const { spacingGuideLabelPadding } = this.styleOptions.value

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
    this.guideLine!.height = appHeight
  }
}
