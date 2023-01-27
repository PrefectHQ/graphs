import type { Viewport } from 'pixi-viewport'
import { BitmapText, Container, Graphics } from 'pixi.js'
import type { Application } from 'pixi.js'
import { ComputedRef, watch, WatchStopHandle } from 'vue'
import { getBitmapFonts } from './bitmapFonts'
import { timelineScale } from './timelineScale'
import { ParsedThemeStyles } from '@/models'

type TimelinePlayheadProps = {
  viewportRef: Viewport,
  appRef: Application,
  styles: ComputedRef<ParsedThemeStyles>,
}

export class TimelinePlayhead extends Container {
  private readonly viewportRef
  private readonly appRef
  private readonly styles: ComputedRef<ParsedThemeStyles>

  private readonly unwatch: WatchStopHandle

  private readonly playhead = new Graphics()
  private label: BitmapText | undefined

  public constructor({
    viewportRef,
    appRef,
    styles,
  }: TimelinePlayheadProps) {
    super()

    this.viewportRef = viewportRef
    this.appRef = appRef
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
    const textStyles = await getBitmapFonts(this.styles.value)
    this.label = new BitmapText('00:00:00', textStyles.playheadTimerLabel)

    this.label.x = -this.label.width * 1.05
    this.label.y = this.appRef.screen.height - this.label.height * 1.5
    this.addChild(this.label)

    setInterval(() => {
      const date = new Date()
      this.label!.text = date.toLocaleTimeString().replace(/AM|PM/, '')
    }, 1000)
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
    }
  }

  public destroy(): void {
    this.unwatch()
    super.destroy.call(this)
  }
}
