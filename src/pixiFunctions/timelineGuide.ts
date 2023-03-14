import { Cull } from '@pixi-essentials/cull'
import { Application, BitmapText, Container, Sprite } from 'pixi.js'
import { ComputedRef } from 'vue'
import { ParsedThemeStyles } from '@/models'
import { getBitmapFonts } from '@/pixiFunctions/bitmapFonts'
import { getSimpleFillTexture } from '@/pixiFunctions/nodeSprites'

type TimelineGuideProps = {
  appRef: Application,
  labelText: string | null,
  styles: ComputedRef<ParsedThemeStyles>,
  cull: Cull,
}

export class TimelineGuide extends Container {
  private readonly appRef
  private readonly labelText
  private readonly styles
  private readonly cull

  private guideLine: Sprite | undefined
  private label: BitmapText | undefined

  public constructor({
    appRef,
    labelText,
    styles,
    cull,
  }: TimelineGuideProps) {
    super()

    cull.add(this)

    this.appRef = appRef
    this.labelText = labelText
    this.styles = styles
    this.cull = cull

    this.initGuideLine()
    this.drawLabel()

    this.interactive = false
  }

  private initGuideLine(): void {
    const { appRef } = this
    const { colorGuideLine } = this.styles.value

    const texture = getSimpleFillTexture({
      pixiApp: appRef,
      fill: colorGuideLine,
    })

    this.guideLine = new Sprite(texture)
    this.guideLine.width = 1
    this.guideLine.height = appRef.screen.height
    this.addChild(this.guideLine)
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
    this.guideLine!.height = appHeight
  }

  public destroy(): void {
    this.cull.remove(this)

    super.destroy()
  }
}
