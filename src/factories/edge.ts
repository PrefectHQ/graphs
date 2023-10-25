import { Container, Point, SimpleRope } from 'pixi.js'
import { DEFAULT_EDGE_CONTAINER_NAME } from '@/consts'
import { ArrowDirection, arrowFactory } from '@/factories/arrow'
import { Pixels } from '@/models/layout'
import { getPixelTexture } from '@/textures/pixel'
import { repeat } from '@/utilities/repeat'

export type EdgeFactory = Awaited<ReturnType<typeof edgeFactory>>

const totalPoints = 2

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function edgeFactory() {
  const container = new Container()
  const { arrow, render: renderArrow } = await arrowFactory()
  const pixel = await getPixelTexture()
  const points = repeat(totalPoints, () => new Point())
  const rope = new SimpleRope(pixel, points)

  container.name = DEFAULT_EDGE_CONTAINER_NAME

  renderArrow({
    size: 10,
    rotate: ArrowDirection.Right,
  })

  container.addChild(arrow)
  container.addChild(rope)

  function render({ x, y }: Pixels): Container {
    const position = {
      x: x - arrow.width,
      y,
    }

    points[0].set(0, 0)
    points[1].set(x - 4, y)

    arrow.position = position


    return container
  }

  return {
    container,
    render,
  }
}