import { Container, Point, SimpleRope, Sprite, Texture } from 'pixi.js'
import { watch, WatchStopHandle } from 'vue'
import { GraphState } from '@/models'
import {
  TimelineNode,
  timelineNodeBoxName,
  getArrowTexture,
  getSimpleFillTexture,
  simpleFillTextureSize
} from '@/pixiFunctions'

const minimumBezier = 64
const edgeFidelity = 20

type TimelineEdgeProps = {
  sourceNode: TimelineNode,
  targetNode: TimelineNode,
  state: GraphState,
}

export class TimelineEdge extends Container {
  private readonly sourceNode
  private readonly targetNode
  private readonly graphState

  private sourceX: number = 0
  private sourceY: number = 0
  private targetX: number = 0
  private targetY: number = 0
  private sourceControlPointX: number = 0
  private sourceControlPointY: number = 0
  private targetControlPointX: number = 0
  private targetControlPointY: number = 0

  private readonly edgePoints: Point[]
  private readonly edge: SimpleRope
  private readonly arrow = new Container()

  private readonly unWatchers: WatchStopHandle[] = []

  public constructor({
    sourceNode,
    targetNode,
    state,
  }: TimelineEdgeProps) {
    super()

    this.sourceNode = sourceNode
    this.targetNode = targetNode
    this.graphState = state

    this.assignBezierPositions()

    this.edgePoints = this.initEdgePoints()
    this.edge = this.initEdge()
    this.addChild(this.edge)

    this.drawArrow()
    this.addChild(this.arrow)

    this.initCulling()
    this.initWatchers()
  }

  private initCulling(): void {
    // Note: edges are not culled because problems arise when expanding/contracting subNodes.
    const { cull } = this.graphState

    cull.add(this.arrow)
  }

  private initWatchers(): void {
    const { styleOptions, viewport } = this.graphState

    this.unWatchers.push(
      watch([styleOptions], () => {
        this.updateStyle()
      }, { deep: true }),
    )

    viewport.on('frame-end', () => {
      if (this.sourceNode.destroyed || this.targetNode.destroyed) {
        return
      }

      if (this.hasEdgeChanged()) {
        this.update()
      }
    })
  }

  private assignBezierPositions(): void {
    this.sourceX = this.getSourceX()
    this.sourceY = this.getNodeY(this.sourceNode)
    this.targetX = this.targetNode.x
    this.targetY = this.getNodeY(this.targetNode)

    this.sourceControlPointX = this.getXBezier(this.sourceX)
    this.sourceControlPointY = this.sourceY
    this.targetControlPointX = this.getXBezier(this.targetX, true)
    this.targetControlPointY = this.targetY
  }

  private initEdge(): SimpleRope {
    const { spacingEdgeWidth } = this.graphState.styleOptions.value
    const texture = this.getEdgeTexture()

    return new SimpleRope(texture, this.edgePoints, spacingEdgeWidth / simpleFillTextureSize)
  }

  private initEdgePoints(): Point[] {
    const points: Point[] = []

    for (let i = 0; i < edgeFidelity; i++) {
      const point = i === edgeFidelity - 1
        ? { x: this.targetX, y: this.targetY }
        : this.getPointBezierPosition(i / edgeFidelity)
      points.push(new Point(point.x, point.y))
    }

    // the target anchor point accommodates for bezier curves often end short of the target
    const targetAnchorPointPosition = this.getTargetAnchorPointPosition()
    const targetAnchorPoint = new Point(targetAnchorPointPosition.x, targetAnchorPointPosition.y)
    points.push(targetAnchorPoint)

    return points
  }

  private drawArrow(): void {
    const { arrow, targetX, targetY } = this
    const { pixiApp, styleOptions } = this.graphState
    const { colorEdge, spacingEdgeWidth, spacingNodeEdgeLength } = styleOptions.value

    const arrowTexture = getArrowTexture({
      pixiApp,
      strokeColor: colorEdge,
      edgeWidth: spacingEdgeWidth,
      edgeLength: spacingNodeEdgeLength,
    })

    const arrowSprite = new Sprite(arrowTexture)
    arrowSprite.anchor.set(1, 0.5)

    arrow.addChild(arrowSprite)
    arrow.position.set(targetX, targetY)
  }

  /**
   * Update functions
   */
  public update(): void {
    this.assignBezierPositions()
    this.arrow.position.set(this.targetX, this.targetY)

    this.edgePoints.forEach((point, index) => {
      const newPoint = index === this.edgePoints.length - 1
        ? this.getTargetAnchorPointPosition()
        : this.getPointBezierPosition(index / edgeFidelity)
      point.set(newPoint.x, newPoint.y)
    })
  }

  private updateStyle(): void {
    this.arrow.removeChildren()
    this.drawArrow()

    this.edge.texture = this.getEdgeTexture()
  }

  /**
   * Utilities
   */
  private hasEdgeChanged(): boolean {
    const currentSourceX = this.getSourceX()
    const currentSourceY = this.getNodeY(this.sourceNode)
    const currentTargetX = this.targetNode.x
    const currentTargetY = this.getNodeY(this.targetNode)

    return currentSourceX !== this.sourceX
      || currentSourceY !== this.sourceY
      || currentTargetX !== this.targetX
      || currentTargetY !== this.targetY
  }

  private getSourceX(): number {
    return this.sourceNode.x + this.sourceNode.getChildByName(timelineNodeBoxName).getLocalBounds().width
  }

  private getNodeY(node: TimelineNode): number {
    return node.y + node.getChildByName(timelineNodeBoxName).getLocalBounds().height / 2
  }

  private readonly getXBezier = (xPos: number, upstream?: boolean): number => {
    const { sourceX, targetX } = this

    const bezierLength = (targetX - sourceX) / 2
    return xPos + (bezierLength > minimumBezier ? bezierLength : minimumBezier) * (upstream ? -1 : 1)
  }

  private getEdgeTexture(): Texture {
    const { pixiApp, styleOptions } = this.graphState
    const { colorEdge } = styleOptions.value

    const texture = getSimpleFillTexture({
      pixiApp,
      fill: colorEdge,
    })

    return texture
  }

  private readonly getPointBezierPosition = (pointOnPath: number): { x: number, y: number } => {
    // https://javascript.info/bezier-curve#de-casteljau-s-algorithm
    const {
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourceControlPointX,
      sourceControlPointY,
      targetControlPointX,
      targetControlPointY,
    } = this

    const cx1 = sourceX + (sourceControlPointX - sourceX) * pointOnPath
    const cy1 = sourceY + (sourceControlPointY - sourceY) * pointOnPath
    const cx2 = sourceControlPointX + (targetControlPointX - sourceControlPointX) * pointOnPath
    const cy2 = sourceControlPointY + (targetControlPointY - sourceControlPointY) * pointOnPath
    const cx3 = targetControlPointX + (targetX - targetControlPointX) * pointOnPath
    const cy3 = targetControlPointY + (targetY - targetControlPointY) * pointOnPath

    const cx4 = cx1 + (cx2 - cx1) * pointOnPath
    const cy4 = cy1 + (cy2 - cy1) * pointOnPath
    const cx5 = cx2 + (cx3 - cx2) * pointOnPath
    const cy5 = cy2 + (cy3 - cy2) * pointOnPath

    const x = cx4 + (cx5 - cx4) * pointOnPath
    const y = cy4 + (cy5 - cy4) * pointOnPath

    return { x, y }
  }

  private getTargetAnchorPointPosition(): { x: number, y: number } {
    const xOffset = 2

    return { x: this.targetX - xOffset, y: this.targetY }
  }

  public destroy(): void {
    const { cull } = this.graphState
    cull.remove(this.arrow)
    this.unWatchers.forEach((unwatch) => unwatch())
    super.destroy.call(this)
  }
}
