import { Ticker } from 'pixi.js'
import { DEFAULT_EDGE_CULLING_THRESHOLD } from '@/consts'
import { waitForEvent } from '@/objects/events'
import { waitForViewport } from '@/objects/viewport'
import { VisibilityCull } from '@/services/visibilityCull'

let instance: VisibilityCull | null = null
let callback: (() => void) | null = null

export async function startEdgeCulling(): Promise<void> {
  const viewport = await waitForViewport()

  instance = new VisibilityCull()

  callback = (): void => {
    if (viewport.dirty) {
      const visible = viewport.scale.x > DEFAULT_EDGE_CULLING_THRESHOLD

      instance?.toggle(visible)
    }
  }

  Ticker.shared.add(callback)
}

export function stopEdgeCulling(): void {
  if (callback) {
    Ticker.shared.remove(callback)
  }

  instance?.clear()
  instance = null
  callback = null
}

export async function waitForEdgeCull(): Promise<VisibilityCull> {
  if (instance) {
    return instance
  }

  return await waitForEvent('edgeCullCreated')
}