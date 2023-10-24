import { DisplayObject, Ticker } from 'pixi.js'
import { DEFAULT_LABEL_CULLING_THRESHOLD } from '@/consts'
import { waitForEvent } from '@/objects/events'
import { waitForViewport } from '@/objects/viewport'

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
}

let instance: LabelCull | null = null
let callback: (() => void) | null = null

export async function startLabelCulling(): Promise<void> {
  const viewport = await waitForViewport()

  instance = new LabelCull()

  callback = (): void => {
    if (viewport.dirty) {
      const visible = viewport.scale.x > DEFAULT_LABEL_CULLING_THRESHOLD

      instance?.toggle(visible)
    }
  }

  Ticker.shared.add(callback)
}

export function stopLabelCulling(): void {
  if (callback) {
    Ticker.shared.remove(callback)
  }

  instance = null
  callback = null
}

export async function waitForLabelCull(): Promise<LabelCull> {
  if (instance) {
    return instance
  }

  return await waitForEvent('labelCullCreated')
}