import { Sprite, Texture } from 'pixi.js'
import { emitter } from '@/objects/events'
import { scaleX, scaleY } from '@/objects/scales'
import { viewport } from '@/objects/viewport'

let sprite: Sprite

// add a red box
export function createBox(): void {
  sprite = viewport.addChild(new Sprite(Texture.WHITE))
  sprite.tint = 0xff0000

  renderBox()
}

export function renderBox(): void {
  const x = scaleX(10)
  const y = scaleY(10)
  const width = scaleX(20) - x
  const height = scaleY(20) - y

  sprite.width = Math.max(width, 1)
  sprite.height = height
  sprite.position.set(x, y)
}

emitter.on('scaleXUpdated', () => renderBox())