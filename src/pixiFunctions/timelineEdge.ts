import { Container, Graphics, Sprite } from 'pixi.js'
import { watch, WatchStopHandle } from 'vue'
import { GraphState } from '@/models'
import {
  TimelineNode,
  timelineNodeBoxName,
  getArrowTexture
} from '@/pixiFunctions'

const minimumBezier = 64

type TimelineEdgeProps = {
  sourceNode: TimelineNode,
  targetNode: TimelineNode,
  graphState: GraphState,
}

export class TimelineEdge extends Container {
  private readonly sourceNode
  private readonly targetNode
  private readonly graphState

  private sourceX: number = 0
  private sourceY: number = 0
  private targetX: number = 0
  private targetY: number = 0

  private readonly edge = new Graphics()
  private readonly arrow = new Container()

  private readonly unWatchers: WatchStopHandle[] = []

  public constructor({
    sourceNode,
    targetNode,
    graphState,
  }: TimelineEdgeProps) {
    super()

    this.sourceNode = sourceNode
    this.targetNode = targetNode
    this.graphState = graphState

    this.assignStartAndEndPositions()

    this.drawEdge()
    this.addChild(this.edge)

    this.drawArrow()
    this.addChild(this.arrow)

    this.initWatchers()
  }

  private initWatchers(): void {
    const { styleOptions } = this.graphState

    this.unWatchers.push(
      watch([styleOptions], () => {
        this.update(true)
      }, { deep: true }),
    )
  }

  private assignStartAndEndPositions(): void {
    this.sourceX = this.sourceNode.x + this.sourceNode.getChildByName(timelineNodeBoxName).getLocalBounds().width
    this.sourceY = this.sourceNode.y + this.sourceNode.getChildByName(timelineNodeBoxName).getLocalBounds().height / 2
    this.targetX = this.targetNode.x
    this.targetY = this.targetNode.y + this.targetNode.getChildByName(timelineNodeBoxName).getLocalBounds().height / 2
  }

  private drawEdge(): void {
    const { colorEdge, spacingEdgeWidth } = this.graphState.styleOptions.value
    const { edge, sourceX, sourceY, targetX, targetY } = this

    const sourceBezierX = this.getXBezier(sourceX)
    const targetBezierX = this.getXBezier(targetX, true)

    edge.clear()
    edge.lineStyle(spacingEdgeWidth, colorEdge, 1, 0.5)
    edge.moveTo(sourceX, sourceY)
    edge.bezierCurveTo(
      sourceBezierX, sourceY,
      targetBezierX, targetY,
      targetX - spacingEdgeWidth, targetY,
    )
  }

  private readonly getXBezier = (xPos: number, upstream?: boolean): number => {
    const { sourceX, targetX } = this

    const bezierLength = (targetX - sourceX) / 2
    return xPos + (bezierLength > minimumBezier ? bezierLength : minimumBezier) * (upstream ? -1 : 1)
  }

  private drawArrow(newStyles?: boolean): void {
    const { arrow, targetX, targetY } = this

    if (newStyles) {
      arrow.removeChildren()
    }

    if (arrow.children.length > 0) {
      arrow.position.set(targetX, targetY)
    }

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

  public update(newStyles?: boolean): void {
    this.assignStartAndEndPositions()
    this.drawEdge()
    this.drawArrow(newStyles)
  }

  public destroy(): void {
    this.unWatchers.forEach((unwatch) => unwatch())
    super.destroy.call(this)
  }
}
