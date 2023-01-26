import type { Viewport } from 'pixi-viewport'
import { Application, Container, Graphics, UPDATE_PRIORITY } from 'pixi.js'

export class DeselectLayer extends Container {
  private readonly appRef: Application
  private readonly viewportRef: Viewport
  private readonly layer = new Graphics()

  public constructor(appRef: Application, viewportRef: Viewport) {
    super()
    this.appRef = appRef
    this.viewportRef = viewportRef

    this.drawLayer()

    this.initUpdater()

    this.interactive = true
  }

  private drawLayer(): void {
    const { xPos, yPos, width, height } = this.getDimensions()

    this.layer.beginFill(0xFFFFFF, 1)
    this.layer.drawRect(xPos, yPos, width, height)
    this.layer.endFill()

    // workaround for pixi not rendering graphics with no fill or stroke
    // zero alpha fill is not rendered at first
    // read more here: https://github.com/pixijs/pixijs/issues/5614
    this.layer.alpha = 0

    this.addChild(this.layer)
  }

  private getDimensions(): { xPos: number, yPos: number, width: number, height: number } {
    return {
      xPos: this.viewportRef.left,
      yPos: this.viewportRef.top,
      width: this.viewportRef.right - this.viewportRef.left,
      height: this.viewportRef.bottom - this.viewportRef.top,
    }
  }

  private initUpdater(): void {
    this.appRef.ticker.add(() => {
      this.update()
    }, null, UPDATE_PRIORITY.LOW)
  }

  private update(): void {
    const { xPos, yPos, width, height } = this.getDimensions()
    this.x = xPos
    // eslint-disable-next-line id-length
    this.y = yPos
    this.width = width
    this.height = height
  }
}
