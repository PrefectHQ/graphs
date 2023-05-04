import { Viewport } from 'pixi-viewport'
import { Application, BitmapText, Container, Sprite } from 'pixi.js'
import { watch } from 'vue'
import { GraphState, ParsedThemeStyles } from '@/models/FlowRunTimeline'
import { getBitmapFonts, getSimpleFillTexture } from '@/pixiFunctions'
import { ViewportUpdatedCheck, viewportUpdatedFactory } from '@/utilities/viewport'

export type GuideDateFormatter = (value: Date) => string

export type GuidesArgs = {
  application: Application,
  viewport: Viewport,
  styles: ParsedThemeStyles,
}

export class Guide extends Container {

  private readonly state: GraphState
  private readonly viewportUpdated: ViewportUpdatedCheck
  private format: GuideDateFormatter | undefined
  private date: Date | undefined
  private line: Sprite | undefined
  private label: BitmapText | undefined
  private readonly unwatch: ReturnType<typeof watch>

  public constructor(state: GraphState) {
    super()

    this.state = state
    this.viewportUpdated = viewportUpdatedFactory(state.viewport)

    this.state.pixiApp.ticker.add(this.tick)

    this.interactive = false

    this.createLine()
    this.createLabel()

    this.unwatch = watch(state.styleOptions, () => {
      this.createLine()
      this.createLabel()
    })
  }

  public setDate(value: Date): void {
    const updated = value.getTime() !== this.date?.getTime()

    this.date = value

    if (updated) {
      this.updatePosition()
      this.updateLabel()
    }

  }

  public setFormat(value: GuideDateFormatter): void {
    this.format = value

    this.updateLabel()
  }

  public destroy(): void {
    this.state.pixiApp.ticker.remove(this.tick)

    super.destroy.call(this)
  }

  private readonly tick = (): void => {
    if (!this.date || !this.viewportUpdated()) {
      return
    }

    this.updatePosition()
  }

  private createLine(): void {
    const texture = getSimpleFillTexture({
      pixiApp: this.state.pixiApp,
      fill: this.state.styleOptions.value.colorGuideLine,
    })

    this.line = new Sprite(texture)
    this.line.width = 1
    this.line.height = this.state.pixiApp.screen.height
    this.addChild(this.line)
  }

  private async createLabel(): Promise<void> {
    const fonts = await getBitmapFonts(this.state.styleOptions.value)
    this.label = new BitmapText('', fonts.timeMarkerLabel)

    const padding = this.state.styleOptions.value.spacingGuideLabelPadding
    this.label.position.set(padding, padding)

    this.addChild(this.label)

    this.updateLabel()
  }

  private getPositionX(): number {
    if (!this.date) {
      throw new Error('Guide position requested for undefined date')
    }

    const { viewport } = this.state

    return this.state.timeScale.dateToX(this.date) * viewport.scale._x + viewport.worldTransform.tx
  }

  private updatePosition(): void {
    const x = this.getPositionX()

    this.position.set(x, 0)
  }

  private updateLabel(): void {
    if (!this.format || !this.date || !this.label) {
      return
    }

    this.label.text = this.format(this.date)
  }
}