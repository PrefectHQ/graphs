import { Sprite } from 'pixi.js'
import { getPixelTexture } from '@/textures/pixel'

export async function rectangleFactory(): Promise<Sprite> {
  const texture = await getPixelTexture()

  return new Sprite(texture)
}