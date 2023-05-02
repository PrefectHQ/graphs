import { Viewport } from 'pixi-viewport'
import { Application, Container, Sprite } from 'pixi.js'
import { getSimpleFillTexture, timelineScale } from '@/pixiFunctions'
import { colorToHex } from '@/utilities'

export type GuidesArgs = {
  application: Application,
  viewport: Viewport,
  date?: Date,
}

export class Guide extends Container {
  private readonly application: Application
  private readonly viewport: Viewport
  private previousViewportLeft: number
  private previousViewportRight: number

  private date: Date | undefined
  private line: Sprite | undefined

  public constructor({
    application,
    viewport,
  }: GuidesArgs) {
    super()

    this.application = application
    this.viewport = viewport
    this.previousViewportLeft = this.viewport.left
    this.previousViewportRight = this.viewport.right

    this.application.ticker.add(this.tick)

    this.visible = false
    this.interactive = false

    this.createLine()
  }

  public setDate(value: Date): void {
    const updated = value.getTime() !== this.date?.getTime()

    this.date = value

    this.visible = true

    if (updated) {
      this.updatePosition()
    }
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
      fill: colorToHex('#ffffff'),
    })

    this.line = new Sprite(texture)
    this.line.width = 1
    this.line.height = this.application.screen.height
    this.addChild(this.line)
  }

  private updatePosition(): void {
    const x = this.getPositionX()
    this.position.set(x, 0)
  }

  private getPositionX(): number {
    if (!this.date) {
      throw new Error('Guide position requested for undefined date')
    }

    return timelineScale.dateToX(this.date) * this.viewport.scale._x + this.viewport.worldTransform.tx
  }
}