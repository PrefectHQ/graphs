import { Viewport } from 'pixi-viewport'
import { Application, BitmapText, Container, Sprite } from 'pixi.js'
import { ParsedThemeStyles } from '@/models/FlowRunTimeline'
import { getBitmapFonts, getSimpleFillTexture, timelineScale } from '@/pixiFunctions'
import { colorToHex } from '@/utilities'

export type GuideDateFormatter = (value: Date) => string

export type GuidesArgs = {
  application: Application,
  viewport: Viewport,
  styles: ParsedThemeStyles,
}

export class Guide extends Container {
  private readonly application: Application
  private readonly viewport: Viewport
  private readonly styles: ParsedThemeStyles
  private previousViewportLeft: number
  private previousViewportRight: number

  private format: GuideDateFormatter | undefined
  private date: Date | undefined
  private line: Sprite | undefined
  private label: BitmapText | undefined

  public constructor({
    application,
    viewport,
    styles,
  }: GuidesArgs) {
    super()

    this.application = application
    this.viewport = viewport
    this.styles = styles
    this.previousViewportLeft = this.viewport.left
    this.previousViewportRight = this.viewport.right

    this.application.ticker.add(this.tick)

    this.interactive = false

    this.createLine()
    this.createLabel()
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
    this.application.ticker.remove(this.tick)

    super.destroy.call(this)
  }

  private readonly tick = (): void => {
    if (!this.date) {
      return
    }

    const { left, right } = this.viewport

    if (this.previousViewportLeft === left && this.previousViewportRight === right) {
      return
    }

    this.previousViewportLeft = left
    this.previousViewportRight = right

    this.updatePosition()
  }

  private createLine(): void {
    const texture = getSimpleFillTexture({
      pixiApp: this.application,
      // update with styles
      fill: colorToHex('#ffffff'),
    })

    this.line = new Sprite(texture)
    this.line.width = 1
    this.line.height = this.application.screen.height
    this.addChild(this.line)
  }

  private async createLabel(): Promise<void> {
    const fonts = await getBitmapFonts(this.styles)
    this.label = new BitmapText('', fonts.timeMarkerLabel)
    this.label.position.set(4, 4)

    this.addChild(this.label)

    this.updateLabel()
  }

  private getPositionX(): number {
    if (!this.date) {
      throw new Error('Guide position requested for undefined date')
    }

    return timelineScale.dateToX(this.date) * this.viewport.scale._x + this.viewport.worldTransform.tx
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