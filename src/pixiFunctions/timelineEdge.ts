import { Container, Graphics } from 'pixi.js'
import { ComputedRef, watch, WatchStopHandle } from 'vue'
import { TimelineNode, timelineNodeBoxName } from './timelineNode'
import { ParsedThemeStyles } from '@/models'

const minimumBezier = 40

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
  private directionFromSource: 'end' | 'up' | 'down' = 'end'

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
    const { spacingMinimumNodeEdgeGap } = this.styles.value

    this.sourceX = this.sourceNode.x + this.sourceNode.getChildByName(timelineNodeBoxName).getLocalBounds().width
    this.sourceY = this.sourceNode.y + this.sourceNode.getChildByName(timelineNodeBoxName).getLocalBounds().height / 2
    this.targetX = this.targetNode.x
    this.targetY = this.targetNode.y + this.targetNode.getChildByName(timelineNodeBoxName).getLocalBounds().height / 2

    if (this.sourceX > this.targetX - spacingMinimumNodeEdgeGap) {
      this.directionFromSource = this.sourceY > this.targetY ? 'up' : 'down'

      if (this.directionFromSource === 'up') {
        this.sourceY = this.sourceNode.y
        return
      }

      this.sourceY = this.sourceNode.y + this.sourceNode.getChildByName(timelineNodeBoxName).getLocalBounds().height
    }
  }

  private drawEdge(): void {
    const { colorEdge, spacingEdgeWidth } = this.styles.value
    const { edge, targetX, targetY } = this

    const { sourceX, sourceY } = this.getSourcePosition()
    const { sourceBezierX, sourceBezierY } = this.getSourceBezier(sourceX)
    const { targetBezierX, targetBezierY } = this.getTargetBezier()

    edge.clear()
    edge.lineStyle(spacingEdgeWidth, colorEdge, 1, 0.5)
    edge.moveTo(sourceX, sourceY)
    edge.bezierCurveTo(
      sourceBezierX, sourceBezierY,
      targetBezierX, targetBezierY,
      targetX, targetY,
    )
  }

  private readonly getSourcePosition = (): { sourceX: number, sourceY: number } => {
    const { sourceX, sourceY } = this
    const { spacingMinimumNodeEdgeGap } = this.styles.value

    if (this.directionFromSource === 'end') {
      return { sourceX, sourceY }
    }

    const nodeWidth = this.sourceNode.width

    return {
      sourceX: nodeWidth > spacingMinimumNodeEdgeGap * 2
        ? sourceX - spacingMinimumNodeEdgeGap
        : sourceX - nodeWidth / 2,
      sourceY,
    }
  }

  private readonly getSourceBezier = (srcX: number): { sourceBezierX: number, sourceBezierY: number } => {
    const { sourceY, targetX, directionFromSource } = this

    if (directionFromSource === 'end') {
      const bezierLength = (targetX - srcX) / 2
      const sourceBezierX = srcX + (bezierLength > minimumBezier ? bezierLength : minimumBezier)

      return {
        sourceBezierX,
        sourceBezierY: sourceY,
      }
    }

    return {
      sourceBezierX: srcX,
      sourceBezierY: sourceY,
    }
  }

  private readonly getTargetBezier = (): { targetBezierX: number, targetBezierY: number } => {
    const { targetX, sourceX, targetY } = this

    const bezierLength = (targetX - sourceX) / 2
    const targetBezierX = targetX - (bezierLength > minimumBezier ? bezierLength : minimumBezier)

    return {
      targetBezierX,
      targetBezierY: targetY,
    }
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
