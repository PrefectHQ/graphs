import { Cull } from '@pixi-essentials/cull'
import { Ticker } from 'pixi.js'
import { waitForApplication } from '@/objects/application'
import { emitter, waitForEvent } from '@/objects/events'
import { waitForViewport } from '@/objects/viewport'

let cullInstance: Cull | null = null
let callback: (() => void) | null = null

export async function startCulling(): Promise<void> {
  const viewport = await waitForViewport()
  const application = await waitForApplication()

  // this cull uses renderable so any other custom logic for showing or hiding must use
  // the "visible" property or this will interfere
  cullInstance = new Cull({
    toggle: 'renderable',
  })

  callback = (): void => {
    if (viewport.dirty) {
      cullInstance?.cull(application.renderer.screen)
      viewport.dirty = false
    }
  }

  Ticker.shared.add(callback)

  emitter.emit('cullCreated', cullInstance)
}

export function stopCulling(): void {
  if (callback) {
    Ticker.shared.remove(callback)
  }

  cullInstance = null
  callback = null
}

export async function cull(): Promise<void> {
  const viewport = await waitForViewport()

  viewport.dirty = true
}

export function uncull(): void {
  if (cullInstance) {
    cullInstance.uncull()
  }
}

export async function waitForCull(): Promise<Cull> {
  if (cullInstance) {
    return cullInstance
  }

  return await waitForEvent('cullCreated')
}