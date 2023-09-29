import { Viewport } from 'pixi-viewport'
import { application } from '@/objects/application'

export let viewport: Viewport

export function createViewport(): void {

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
}