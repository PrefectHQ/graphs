import { Cull } from '@pixi-essentials/cull'
import { Ticker } from 'pixi.js'
import { waitForApplication } from '@/objects/application'
import { emitter, waitForEvent } from '@/objects/events'
import { waitForViewport } from '@/objects/viewport'

let cull: Cull | null = null
let callback: (() => void) | null = null

export async function startCulling(): Promise<void> {
  const viewport = await waitForViewport()
  const application = await waitForApplication()

  cull = new Cull()

  callback = (): void => {
    if (viewport.dirty) {
      cull?.cull(application.renderer.screen)
      viewport.dirty = false
    }
  }

  Ticker.shared.add(callback)

  emitter.emit('cullCreated', cull)
}

export function stopCulling(): void {
  if (callback) {
    Ticker.shared.remove(callback)
  }

  cull = null
  callback = null
}

export function pauseCulling(): void {
  if (!cull) {
    return
  }

  cull.uncull()
}

export async function resumeCulling(): Promise<void> {
  if (!cull) {
    return
  }

  const application = await waitForApplication()

  cull.cull(application.renderer.screen)
}

export async function waitForCull(): Promise<Cull> {
  if (cull) {
    return cull
  }

  return await waitForEvent('cullCreated')
}