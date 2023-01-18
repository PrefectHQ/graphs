import { Application, Container, Graphics } from 'pixi.js'

export class DeselectLayer extends Container {
  private readonly appRef: Application
  private readonly layer = new Graphics()

  public constructor(appRef: Application) {
    super()
    this.appRef = appRef

    this.drawLayer()

    this.interactive = true
  }

  private drawLayer(): void {
    this.layer.beginFill(0x000000, 1)
    this.layer.drawRect(0, 0, this.appRef.screen.width, this.appRef.screen.height)
    this.layer.endFill()

    // workaround for pixi not rendering graphics with no fill or stroke
    // zero alpha fill is not rendered at first
    // read more here: https://github.com/pixijs/pixijs/issues/5614
    this.layer.alpha = 0.0

    this.addChild(this.layer)
  }

  public update(): void {
    this.layer.clear()
    this.drawLayer()
  }
}
