import { Container, SimpleRope } from 'pixi.js'
import { DEFAULT_EDGE_CONTAINER_NAME } from '@/consts'
import { ArrowDirection, arrowFactory } from '@/factories/arrow'
import { Pixels } from '@/models/layout'
import { getPixelTexture } from '@/textures/pixel'

export type EdgeFactory = Awaited<ReturnType<typeof edgeFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function edgeFactory() {
  const container = new Container()
  const { arrow, render: renderArrow } = await arrowFactory()
  const pixel = await getPixelTexture()

  container.name = DEFAULT_EDGE_CONTAINER_NAME

  renderArrow({
    size: 10,
    rotate: ArrowDirection.Right,
  })

  container.addChild(arrow)

  async function render({ x, y }: Pixels): Promise<Container> {
    const position = {
      x: x - arrow.width,
      y,
    }

    arrow.position = position

    return container
  }

  return {
    container,
    render,
  }
}