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

export function pauseCulling(): void {
  if (cullInstance) {
    cullInstance.uncull()
  }
}

export async function cull(): Promise<void> {
  if (!cullInstance) {
    return
  }

  const application = await waitForApplication()

  cullInstance.cull(application.renderer.screen)
}

export async function resumeCulling(): Promise<void> {
}

export async function waitForCull(): Promise<Cull> {
  if (cullInstance) {
    return cullInstance
  }

  return await waitForEvent('cullCreated')
}