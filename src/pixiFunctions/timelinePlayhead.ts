import { BitmapText, Container, Graphics } from 'pixi.js'
import { watch, WatchStopHandle } from 'vue'
import { GraphState } from '@/models'
import { getBitmapFonts } from '@/pixiFunctions/bitmapFonts'
import { zIndex } from '@/utilities/zIndex'

export class TimelinePlayhead extends Container {
  private readonly state: GraphState

  private readonly unwatch: WatchStopHandle

  private readonly playhead = new Graphics()
  private label: BitmapText | undefined

  public constructor(state: GraphState) {
    super()

    this.state = state

    this.state.cull.add(this)

    this.zIndex = zIndex.playhead

    this.drawPlayhead()

    this.drawTimeLabel()

    this.unwatch = watch(this.state.styleOptions, () => {
      this.playhead.clear()
      this.drawPlayhead()
    })

    this.interactive = false
  }

  private drawPlayhead(): void {
    const {
      colorPlayheadBg,
      spacingPlayheadWidth,
      spacingPlayheadGlowPadding,
    } = this.state.styleOptions.value

    this.playhead.beginFill(colorPlayheadBg, 0.1)
    this.playhead.drawRect(
      0,
      0,
      spacingPlayheadWidth + spacingPlayheadGlowPadding * 2,
      this.state.pixiApp.screen.height,
    )
    this.playhead.endFill()
    this.playhead.beginFill(colorPlayheadBg)
    this.playhead.drawRect(
      spacingPlayheadGlowPadding,
      0,
      spacingPlayheadWidth,
      this.state.pixiApp.screen.height,
    )
    this.playhead.endFill()

    this.addChild(this.playhead)
  }

  private async drawTimeLabel(): Promise<void> {
    const {
      spacingGuideLabelPadding,
      spacingPlayheadGlowPadding,
    } = this.state.styleOptions.value
    const textStyles = await getBitmapFonts(this.state.styleOptions.value)
    const { timeBySeconds } = this.state.formatDateFns.value
    const startDate = timeBySeconds(new Date())
    this.label = new BitmapText(startDate, textStyles.playheadTimerLabel)

    this.label.x = -this.label.width - (spacingPlayheadGlowPadding + spacingGuideLabelPadding)
    this.label.y = this.getTimeLabelY()
    this.addChild(this.label)

    setInterval(() => {
      const date = new Date()
      this.label!.text = timeBySeconds(date)
    }, 1000)
  }

  private getTimeLabelY(): number {
    const { spacingGuideLabelPadding } = this.state.styleOptions.value
    return this.state.pixiApp.screen.height - (this.label!.height + spacingGuideLabelPadding)
  }

  public updatePosition(): void {
    const {
      spacingPlayheadWidth,
      spacingPlayheadGlowPadding,
    } = this.state.styleOptions.value

    this.position.x =
      this.state.timeScale.dateToX(new Date()) * this.state.viewport.scale._x
      + this.state.viewport.worldTransform.tx
      - spacingPlayheadGlowPadding
      - spacingPlayheadWidth / 2

    if (this.playhead.height !== this.state.pixiApp.screen.height) {
      this.playhead.height = this.state.pixiApp.screen.height
      this.label!.y = this.getTimeLabelY()
    }
  }

  public destroy(): void {
    this.state.cull.remove(this)
    this.unwatch()
    this.playhead.destroy()
    super.destroy.call(this)
  }
}
