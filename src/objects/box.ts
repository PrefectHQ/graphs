import { endOfHour, startOfHour } from 'date-fns'
import { Viewport } from 'pixi-viewport'
import { Sprite, Texture } from 'pixi.js'
import { emitter } from '@/objects/events'
import { scaleX, scaleY } from '@/objects/scales'

let sprite: Sprite

export function startBox(): void {
  emitter.on('viewportCreated', createBox)
  emitter.on('scaleXUpdated', renderBox)
}

export function createBox(viewport: Viewport): void {
  sprite = viewport.addChild(new Sprite(Texture.WHITE))
  sprite.tint = 0xff0000
}


export function renderBox(): void {
  const now = new Date()
  const x = scaleX(startOfHour(now))
  const y = scaleY(10)
  const width = scaleX(endOfHour(now)) - x
  const height = scaleY(20) - y

  sprite.width = Math.max(width, 1)
  sprite.height = height
  sprite.position.set(x, y)
}