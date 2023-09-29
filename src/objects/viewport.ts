import { Viewport } from 'pixi-viewport'
import { Sprite, Texture } from 'pixi.js'
import { application } from '@/objects/application'

export let viewport: Viewport

export function createViewport(): void {
  viewport = new Viewport({
    events: application.renderer.events,
    passiveWheel: false,
    worldWidth: 100,
    worldHeight: 100,
  })

  viewport
    .drag()
    .pinch()
    .wheel()
    .decelerate({
      friction: 0.9,
    })

  application.stage.addChild(viewport)

  // add a red box
  const sprite = viewport.addChild(new Sprite(Texture.WHITE))
  sprite.tint = 0xff0000
  sprite.width = sprite.height = 100
  sprite.position.set(100, 100)
}