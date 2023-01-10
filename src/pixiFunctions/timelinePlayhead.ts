import type { Viewport } from 'pixi-viewport'
import { Container, Graphics } from 'pixi.js'
import type { Application } from 'pixi.js'
import { getTimelineStyles } from './timelineStyles'

type TimelinePlayheadProps = {
  viewportRef: Viewport,
  appRef: Application,
  xScale: (date: Date) => number,
}

export class TimelinePlayhead extends Container {
  private readonly viewportRef
  private readonly appRef
  private readonly xScale

  private readonly playheadBg: number
  private readonly playheadWidth = 2
  private readonly playheadGlowPadding: number

  private readonly playhead = new Graphics()

  public constructor({
    viewportRef,
    appRef,
    xScale,
  }: TimelinePlayheadProps) {
    super()

    this.viewportRef = viewportRef
    this.appRef = appRef
    this.xScale = xScale

    const { playheadBg, playheadGlowPadding } = this.getStyles()
    this.playheadBg = playheadBg
    this.playheadGlowPadding = playheadGlowPadding

    this.drawPlayhead()
  }

  private getStyles(): { playheadBg: number, playheadGlowPadding: number } {
    const timelineStyles = getTimelineStyles()

    const playheadBg = Number(timelineStyles.get('--gt-color-playhead-bg') ?? 0x4E82FE)
    const playheadGlowPadding = Number(timelineStyles.get('--gt-spacing-playhead-glow-padding') ?? 8)

    return {
      playheadBg,
      playheadGlowPadding,
    }
  }

  private drawPlayhead(): void {
    this.playhead.beginFill(this.playheadBg, 0.1)
    this.playhead.drawRect(
      0,
      0,
      this.playheadWidth + this.playheadGlowPadding * 2,
      this.appRef.screen.height,
    )
    this.playhead.endFill()
    this.playhead.beginFill(this.playheadBg)
    this.playhead.drawRect(
      this.playheadGlowPadding,
      0,
      this.playheadWidth,
      this.appRef.screen.height,
    )
    this.playhead.endFill()

    this.addChild(this.playhead)
  }

  public updatePosition(): void {
    this.position.x =
      this.xScale(new Date()) * this.viewportRef.scale._x
      + this.viewportRef.worldTransform.tx
      - this.playheadGlowPadding
      - this.playheadWidth / 2

    if (this.playhead.height !== this.appRef.screen.height) {
      this.playhead.height = this.appRef.screen.height
    }
  }
}
