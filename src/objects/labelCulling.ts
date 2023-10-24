import { Ticker } from 'pixi.js'
import { DEFAULT_LABEL_CULLING_THRESHOLD } from '@/consts'
import { waitForEvent } from '@/objects/events'
import { waitForViewport } from '@/objects/viewport'
import { LabelCull } from '@/services/labelCull'

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

  instance?.clear()
  instance = null
  callback = null
}

export async function waitForLabelCull(): Promise<LabelCull> {
  if (instance) {
    return instance
  }

  return await waitForEvent('labelCullCreated')
}