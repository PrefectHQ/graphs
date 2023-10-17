import { Container } from 'pixi.js'
import { Pixels } from '@/models/layout'

export class ContainerService {
  public container = new Container()

  public get position(): Pixels {
    return this.container.position
  }

  public set position(value: Pixels) {
    this.container.position = value
  }

  public get visible(): boolean {
    return this.container.visible
  }

  public set visible(value: boolean) {
    this.container.visible = value
  }

  public get width(): number {
    return this.container.width
  }

}