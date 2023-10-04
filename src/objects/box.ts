import { endOfHour, startOfHour } from 'date-fns'
import { Viewport } from 'pixi-viewport'
import { Sprite, Texture } from 'pixi.js'
import { emitter } from '@/objects/events'
import { Scales, waitForScales } from '@/objects/scales'
import { waitForViewport } from '@/objects/viewport'

let sprite: Sprite | null = null

export async function startBox(): Promise<void> {
  const viewport = await waitForViewport()
  createBox(viewport)

  const scales = await waitForScales()
  renderBox(scales)

  emitter.on('scalesUpdated', renderBox)
}

export function stopBox(): void {
  sprite = null
}

export function createBox(viewport: Viewport): void {
  sprite = viewport.addChild(new Sprite(Texture.WHITE))
  sprite.tint = 0xff0000
}

export function renderBox({ scaleX, scaleY }: Scales): void {
  if (!sprite) {
    return
  }

  const now = new Date()
  const x = scaleX(startOfHour(now))
  const y = scaleY(10)
  const width = scaleX(endOfHour(now)) - x
  const height = scaleY(20) - y

  sprite.width = Math.max(width, 1)
  sprite.height = height
  sprite.position.set(x, y)
}