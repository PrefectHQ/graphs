import type { Viewport } from 'pixi-viewport'
import { Application, BitmapText, Container, Graphics } from 'pixi.js'
import { ComputedRef, watch, WatchStopHandle } from 'vue'
import { FormatDateFns, ParsedThemeStyles } from '@/models'
import { getBitmapFonts } from '@/pixiFunctions/bitmapFonts'
import { timelineScale } from '@/pixiFunctions/timelineScale'

type TimelinePlayheadProps = {
  viewportRef: Viewport,
  appRef: Application,
  formatDateFns: ComputedRef<FormatDateFns>,
  styles: ComputedRef<ParsedThemeStyles>,
}

export class TimelinePlayhead extends Container {
  private readonly viewportRef
  private readonly appRef
  private readonly formatDateFns
  private readonly styles: ComputedRef<ParsedThemeStyles>

  private readonly unwatch: WatchStopHandle

  private readonly playhead = new Graphics()
  private label: BitmapText | undefined

  public constructor({
    viewportRef,
    appRef,
    formatDateFns,
    styles,
  }: TimelinePlayheadProps) {
    super()

    this.viewportRef = viewportRef
    this.appRef = appRef
    this.formatDateFns = formatDateFns
    this.styles = styles

    this.drawPlayhead()

    this.drawTimeLabel()

    this.unwatch = watch(styles, () => {
      this.playhead.clear()
      this.drawPlayhead()
    }, { deep: true })

    this.interactive = false
  }

  private drawPlayhead(): void {
    const {
      colorPlayheadBg,
      spacingPlayheadWidth,
      spacingPlayheadGlowPadding,
    } = this.styles.value

    this.playhead.beginFill(colorPlayheadBg, 0.1)
    this.playhead.drawRect(
      0,
      0,
      spacingPlayheadWidth + spacingPlayheadGlowPadding * 2,
      this.appRef.screen.height,
    )
    this.playhead.endFill()
    this.playhead.beginFill(colorPlayheadBg)
    this.playhead.drawRect(
      spacingPlayheadGlowPadding,
      0,
      spacingPlayheadWidth,
      this.appRef.screen.height,
    )
    this.playhead.endFill()

    this.addChild(this.playhead)
  }

  private async drawTimeLabel(): Promise<void> {
    const {
      spacingGuideLabelPadding,
      spacingPlayheadGlowPadding,
    } = this.styles.value
    const textStyles = await getBitmapFonts(this.styles.value)
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
    const { spacingGuideLabelPadding } = this.styles.value
    return this.appRef.screen.height - (this.label!.height + spacingGuideLabelPadding)
  }

  public updatePosition(): void {
    const {
      spacingPlayheadWidth,
      spacingPlayheadGlowPadding,
    } = this.styles.value

    this.position.x =
      timelineScale.dateToX(new Date()) * this.viewportRef.scale._x
      + this.viewportRef.worldTransform.tx
      - spacingPlayheadGlowPadding
      - spacingPlayheadWidth / 2

    if (this.playhead.height !== this.appRef.screen.height) {
      this.playhead.height = this.appRef.screen.height
      this.label!.y = this.getTimeLabelY()
    }
  }

  public destroy(): void {
    this.unwatch()
    this.playhead.destroy()
    super.destroy.call(this)
  }
}
