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

  public updatePosition(): void {
    const {
      spacingPlayheadWidth,
      spacingPlayheadGlowPadding,
    } = this.styles.value

    this.position.x =
      this.xScale(new Date()) * this.viewportRef.scale._x
      + this.viewportRef.worldTransform.tx
      - spacingPlayheadGlowPadding
      - spacingPlayheadWidth / 2

    if (this.playhead.height !== this.appRef.screen.height) {
      this.playhead.height = this.appRef.screen.height
    }
  }
}
