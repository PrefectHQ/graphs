import { DisplayObject } from 'pixi.js'

type LabelCullStatus = 'hidden' | 'visible'

// This label culler intentionally uses the `visible` property to show and hide labels
// this is because the viewport culling uses the `renderable` property and will interfere
// if the same property is used
export class LabelCull {
  private status: LabelCullStatus = 'visible'
  private readonly labels = new Set<DisplayObject>()

  private get visible(): boolean {
    return this.status === 'visible'
  }

  private get hidden(): boolean {
    return this.status === 'hidden'
  }

  public show(): void {
    if (this.status === 'visible') {
      return
    }

    for (const label of this.labels) {
      label.visible = true
    }

    this.status = 'visible'
  }

  public hide(): void {
    if (this.status === 'hidden') {
      return
    }

    for (const label of this.labels) {
      label.visible = false
    }

    this.status = 'hidden'
  }

  public toggle(visible: boolean): void {
    if (visible) {
      this.show()
    } else {
      this.hide()
    }
  }

  public add(label: DisplayObject): void {
    this.labels.add(label)

    label.visible = this.visible
  }

  public clear(): void {
    this.labels.clear()
  }
}