import { Viewport } from 'pixi-viewport'
import { Application } from 'pixi.js'
import { emitter } from '@/objects/events'

export let viewport: Viewport

export function startViewport(): void {
  emitter.on('applicationCreated', createViewport)
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