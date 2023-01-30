import { Container, Graphics } from 'pixi.js'
import { ComputedRef, watch, WatchStopHandle } from 'vue'
import { TimelineNode, timelineNodeBoxName } from './timelineNode'
import { ParsedThemeStyles } from '@/models'

const minimumBezier = 64

type TimelineEdgeProps = {
  styles: ComputedRef<ParsedThemeStyles>,
  sourceNode: TimelineNode,
  targetNode: TimelineNode,
}

export class TimelineEdge extends Container {
  private readonly styles
  private readonly sourceNode
  private readonly targetNode

  private sourceX: number = 0
  private sourceY: number = 0
  private targetX: number = 0
  private targetY: number = 0

  private readonly edge = new Graphics()
  private readonly arrow = new Graphics()

  private readonly unwatch: WatchStopHandle

  public constructor({
    styles,
    sourceNode,
    targetNode,
  }: TimelineEdgeProps) {
    super()

    this.styles = styles
    this.sourceNode = sourceNode
    this.targetNode = targetNode

    this.assignStartAndEndPositions()

    this.drawEdge()
    this.addChild(this.edge)

    this.drawArrow()
    this.addChild(this.arrow)

    this.unwatch = watch([styles], () => {
      this.update()
    }, { deep: true })
  }

  private assignStartAndEndPositions(): void {
    this.sourceX = this.sourceNode.x + this.sourceNode.getChildByName(timelineNodeBoxName).getLocalBounds().width
    this.sourceY = this.sourceNode.y + this.sourceNode.getChildByName(timelineNodeBoxName).getLocalBounds().height / 2
    this.targetX = this.targetNode.x
    this.targetY = this.targetNode.y + this.targetNode.getChildByName(timelineNodeBoxName).getLocalBounds().height / 2
  }

  private drawEdge(): void {
    const { colorEdge, spacingEdgeWidth } = this.styles.value
    const { edge, sourceX, sourceY, targetX, targetY } = this

    const sourceBezierX = this.getXBezier(sourceX)
    const targetBezierX = this.getXBezier(targetX, true)

    edge.clear()
    edge.lineStyle(spacingEdgeWidth, colorEdge, 1, 0.5)
    edge.moveTo(sourceX, sourceY)
    edge.bezierCurveTo(
      sourceBezierX, sourceY,
      targetBezierX, targetY,
      targetX, targetY,
    )
  }

  private readonly getXBezier = (xPos: number, upstream?: boolean): number => {
    const { sourceX, targetX } = this

    const bezierLength = (targetX - sourceX) / 2
    return xPos + (bezierLength > minimumBezier ? bezierLength : minimumBezier) * (upstream ? -1 : 1)
  }

  private drawArrow(): void {
    const { colorEdge, spacingEdgeWidth, spacingNodeEdgeLength } = this.styles.value
    const { arrow, targetX, targetY } = this

    arrow.clear()
    arrow.lineStyle(spacingEdgeWidth, colorEdge, 1, 0.5)
    arrow.moveTo(targetX - spacingNodeEdgeLength, targetY - spacingNodeEdgeLength)
    arrow.lineTo(targetX, targetY)
    arrow.lineTo(targetX - spacingNodeEdgeLength, targetY + spacingNodeEdgeLength)
  }

  public update(): void {
    this.assignStartAndEndPositions()
    this.drawEdge()
    this.drawArrow()
  }

  public destroy(): void {
    this.unwatch()
    super.destroy.call(this)
  }
}
