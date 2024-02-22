import { Sprite } from 'pixi.js'
import { CircleStyle, getCircleTexture } from '@/textures/circle'

export async function circleFactory(style: CircleStyle): Promise<Sprite> {
  const texture = await getCircleTexture(style)

  return new Sprite(texture)
}