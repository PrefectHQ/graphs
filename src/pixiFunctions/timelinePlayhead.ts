import type { Viewport } from 'pixi-viewport'
import { Container, Graphics } from 'pixi.js'
import type { Application } from 'pixi.js'
import { ComputedRef } from 'vue'
import { ParsedThemeStyles } from '@/models'

type TimelinePlayheadProps = {
  viewportRef: Viewport,
  appRef: Application,
  xScale: (date: Date) => number,
  styles: ComputedRef<ParsedThemeStyles>,
}

export class TimelinePlayhead extends Container {
  private readonly viewportRef
  private readonly appRef
  private readonly xScale
  private readonly styles: ComputedRef<ParsedThemeStyles>

  private readonly playhead = new Graphics()

  public constructor({
    viewportRef,
    appRef,
    xScale,
    styles,
  }: TimelinePlayheadProps) {
    super()

    this.viewportRef = viewportRef
    this.appRef = appRef
    this.xScale = xScale
    this.styles = styles

    this.drawPlayhead()
  }

  private drawPlayhead(): void {
    this.playhead.beginFill(this.styles.value.colorPlayheadBg, 0.1)
    this.playhead.drawRect(
      0,
      0,
      this.styles.value.spacingPlayheadWidth + this.styles.value.spacingPlayheadGlowPadding * 2,
      this.appRef.screen.height,
    )
    this.playhead.endFill()
    this.playhead.beginFill(this.styles.value.colorPlayheadBg)
    this.playhead.drawRect(
      this.styles.value.spacingPlayheadGlowPadding,
      0,
      this.styles.value.spacingPlayheadWidth,
      this.appRef.screen.height,
    )
    this.playhead.endFill()

    this.addChild(this.playhead)
  }

  public updatePosition(): void {
    this.position.x =
      this.xScale(new Date()) * this.viewportRef.scale._x
      + this.viewportRef.worldTransform.tx
      - this.styles.value.spacingPlayheadGlowPadding
      - this.styles.value.spacingPlayheadWidth / 2

    if (this.playhead.height !== this.appRef.screen.height) {
      this.playhead.height = this.appRef.screen.height
    }
  }
}
