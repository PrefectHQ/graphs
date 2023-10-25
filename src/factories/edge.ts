import { Container, Point, SimpleRope } from 'pixi.js'
import { DEFAULT_EDGE_CONTAINER_NAME } from '@/consts'
import { ArrowDirection, arrowFactory } from '@/factories/arrow'
import { Pixels } from '@/models/layout'
import { waitForConfig } from '@/objects/config'
import { getPixelTexture } from '@/textures/pixel'
import { repeat } from '@/utilities/repeat'

export type EdgeFactory = Awaited<ReturnType<typeof edgeFactory>>

const minimumBezier = 64
const totalPoints = 20

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function edgeFactory() {
  const config = await waitForConfig()
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
    const source: Pixels = { x: 0, y: 0 }
    const target: Pixels = { x: x - 4, y }
    const sourceBezier: Pixels = {
      x: getXBezier(source.x, { source, target }),
      y: source.y,
    }
    const targetBezier: Pixels = {
      x: getXBezier(target.x, { source, target }, true),
      y: target.y,
    }

    for (const [index, point] of points.entries()) {
      if (index === points.length - 1) {
        point.set(x - 4, y)
        continue
      }

      const position = getPointBezierPosition(index, {
        source,
        target,
        sourceBezier,
        targetBezier,
      })

      point.set(position.x, position.y)
    }

    arrow.position = {
      x: x - arrow.width,
      y,
    }

    arrow.tint = config.styles.edgeColor
    rope.tint = config.styles.edgeColor

    return container
  }

  return {
    container,
    render,
  }
}

type BezierControlPoints = {
  source: Pixels,
  target: Pixels,
}

function getXBezier(xPos: number, { source, target }: BezierControlPoints, upstream?: boolean): number {
  const bezierLength = (target.x - source.x) / 2

  return xPos + (bezierLength > minimumBezier ? bezierLength : minimumBezier) * (upstream ? -1 : 1)
}

type ControlPoints = {
  source: Pixels,
  target: Pixels,
  sourceBezier: Pixels,
  targetBezier: Pixels,
}

function getPointBezierPosition(pointOnPath: number, control: ControlPoints): Pixels {
  // https://javascript.info/bezier-curve#de-casteljau-s-algorithm
  const point = pointOnPath / totalPoints
  const { source, target, sourceBezier, targetBezier } = control

  const cx1 = source.x + (sourceBezier.x - source.x) * point
  const cy1 = source.y + (sourceBezier.y - source.y) * point
  const cx2 = sourceBezier.x + (targetBezier.x - sourceBezier.x) * point
  const cy2 = sourceBezier.y + (targetBezier.y - sourceBezier.y) * point
  const cx3 = targetBezier.x + (target.x - targetBezier.x) * point
  const cy3 = targetBezier.y + (target.y - targetBezier.y) * point

  const cx4 = cx1 + (cx2 - cx1) * point
  const cy4 = cy1 + (cy2 - cy1) * point
  const cx5 = cx2 + (cx3 - cx2) * point
  const cy5 = cy2 + (cy3 - cy2) * point

  const x = cx4 + (cx5 - cx4) * point
  const y = cy4 + (cy5 - cy4) * point

  return { x, y }
}