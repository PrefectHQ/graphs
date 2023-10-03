import { Viewport } from 'pixi-viewport'
import { Application } from 'pixi.js'
import { waitForApplication } from '@/objects/application'
import { emitter, waitForEvent } from '@/objects/events'

export let viewport: Viewport | null = null

export async function startViewport(): Promise<void> {
  const application = await waitForApplication()

  createViewport(application)
}

export function stopViewport(): void {
  viewport = null
}

export function createViewport(application: Application): void {
  viewport = new Viewport({
    events: application.renderer.events,
    passiveWheel: false,
  })

  viewport
    .drag()
    .pinch()
    .wheel()
    .decelerate({
      friction: 0.9,
    })

  application.stage.addChild(viewport)

  emitter.emit('viewportCreated', viewport)
}

export async function waitForViewport(): Promise<Viewport> {
  if (viewport) {
    return await viewport
  }

  return waitForEvent('viewportCreated')
}