import type { Viewport } from 'pixi-viewport'
import { Container, Graphics } from 'pixi.js'
import type { Application } from 'pixi.js'

const timelinePlayheadStyles = {
  playheadBg: 0x4E82FE,
  playheadWidth: 2,
  playheadGlowPadding: 8,
}

type TimelinePlayheadProps = {
  viewportRef: Viewport,
  appRef: Application,
  xScale: (date: Date) => number,
}

export class TimelinePlayhead extends Container {
  private readonly viewportRef
  private readonly appRef
  private readonly xScale

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

    this.drawPlayhead()
  }

  private drawPlayhead(): void {
    this.playhead.beginFill(timelinePlayheadStyles.playheadBg, 0.1)
    this.playhead.drawRect(
      0,
      0,
      timelinePlayheadStyles.playheadWidth + timelinePlayheadStyles.playheadGlowPadding * 2,
      this.appRef.screen.height,
    )
    this.playhead.endFill()
    this.playhead.beginFill(timelinePlayheadStyles.playheadBg)
    this.playhead.drawRect(
      timelinePlayheadStyles.playheadGlowPadding,
      0,
      timelinePlayheadStyles.playheadWidth,
      this.appRef.screen.height,
    )
    this.playhead.endFill()

    this.addChild(this.playhead)
  }

  public updatePosition(): void {
    this.position.x =
      this.xScale(new Date()) * this.viewportRef.scale._x
      + this.viewportRef.worldTransform.tx
      - timelinePlayheadStyles.playheadGlowPadding
      - timelinePlayheadStyles.playheadWidth / 2

    if (this.playhead.height !== this.appRef.screen.height) {
      this.playhead.height = this.appRef.screen.height
    }
  }
}
