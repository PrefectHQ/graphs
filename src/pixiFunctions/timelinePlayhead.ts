import { Cull } from '@pixi-essentials/cull'
import type { Viewport } from 'pixi-viewport'
import { Application, BitmapText, Container, Graphics } from 'pixi.js'
import { ComputedRef, watch, WatchStopHandle } from 'vue'
import { FormatDateFns, ParsedThemeStyles } from '@/models'
import { getBitmapFonts } from '@/pixiFunctions/bitmapFonts'
import { timelineScale } from '@/pixiFunctions/timelineScale'
import { zIndex } from '@/utilities/zIndex'

type TimelinePlayheadProps = {
  viewport: Viewport,
  pixiApp: Application,
  cull: Cull,
  formatDateFns: ComputedRef<FormatDateFns>,
  styleOptions: ComputedRef<ParsedThemeStyles>,
}

export class TimelinePlayhead extends Container {
  private readonly viewport: Viewport
  private readonly pixiApp: Application
  private readonly cull: Cull
  private readonly formatDateFns
  private readonly styleOptions: ComputedRef<ParsedThemeStyles>

  private readonly unwatch: WatchStopHandle

  private readonly playhead = new Graphics()
  private label: BitmapText | undefined

  public constructor({
    viewport,
    pixiApp,
    cull,
    formatDateFns,
    styleOptions,
  }: TimelinePlayheadProps) {
    super()

    cull.add(this)

    this.viewport = viewport
    this.pixiApp = pixiApp
    this.cull = cull
    this.formatDateFns = formatDateFns
    this.styleOptions = styleOptions
    this.zIndex = zIndex.playhead

    this.drawPlayhead()

    this.drawTimeLabel()

    this.unwatch = watch(styleOptions, () => {
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
    } = this.styleOptions.value

    this.playhead.beginFill(colorPlayheadBg, 0.1)
    this.playhead.drawRect(
      0,
      0,
      spacingPlayheadWidth + spacingPlayheadGlowPadding * 2,
      this.pixiApp.screen.height,
    )
    this.playhead.endFill()
    this.playhead.beginFill(colorPlayheadBg)
    this.playhead.drawRect(
      spacingPlayheadGlowPadding,
      0,
      spacingPlayheadWidth,
      this.pixiApp.screen.height,
    )
    this.playhead.endFill()

    this.addChild(this.playhead)
  }

  private async drawTimeLabel(): Promise<void> {
    const {
      spacingGuideLabelPadding,
      spacingPlayheadGlowPadding,
    } = this.styleOptions.value
    const textStyles = await getBitmapFonts(this.styleOptions.value)
    const { timeBySeconds } = this.formatDateFns.value
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
    const { spacingGuideLabelPadding } = this.styleOptions.value
    return this.pixiApp.screen.height - (this.label!.height + spacingGuideLabelPadding)
  }

  public updatePosition(): void {
    const {
      spacingPlayheadWidth,
      spacingPlayheadGlowPadding,
    } = this.styleOptions.value

    this.position.x =
      timelineScale.dateToX(new Date()) * this.viewport.scale._x
      + this.viewport.worldTransform.tx
      - spacingPlayheadGlowPadding
      - spacingPlayheadWidth / 2

    if (this.playhead.height !== this.pixiApp.screen.height) {
      this.playhead.height = this.pixiApp.screen.height
      this.label!.y = this.getTimeLabelY()
    }
  }

  public destroy(): void {
    this.cull.remove(this)
    this.unwatch()
    this.playhead.destroy()
    super.destroy.call(this)
  }
}
