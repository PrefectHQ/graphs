import { Application, Container, Graphics, Sprite } from 'pixi.js'
import { ComputedRef, watch, WatchStopHandle } from 'vue'
import { ParsedThemeStyles } from '@/models'
import {
  TimelineNode,
  timelineNodeBoxName,
  getArrowTexture
} from '@/pixiFunctions'

const minimumBezier = 64

type TimelineEdgeProps = {
  appRef: Application,
  styles: ComputedRef<ParsedThemeStyles>,
  sourceNode: TimelineNode,
  targetNode: TimelineNode,
}

export class TimelineEdge extends Container {
  private readonly appRef: Application
  private readonly styles
  private readonly sourceNode
  private readonly targetNode

  private sourceX: number = 0
  private sourceY: number = 0
  private targetX: number = 0
  private targetY: number = 0

  private readonly edge = new Graphics()
  private readonly arrow = new Container()

  private readonly unwatch: WatchStopHandle

  public constructor({
    appRef,
    styles,
    sourceNode,
    targetNode,
  }: TimelineEdgeProps) {
    super()

    this.appRef = appRef
    this.styles = styles
    this.sourceNode = sourceNode
    this.targetNode = targetNode

    this.assignStartAndEndPositions()

    this.drawEdge()
    this.addChild(this.edge)

    this.drawArrow()
    this.addChild(this.arrow)

    this.unwatch = watch([styles], () => {
      this.update(true)
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

    const { colorEdge, spacingEdgeWidth, spacingNodeEdgeLength } = this.styles.value

    const arrowTexture = getArrowTexture({
      appRef: this.appRef,
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
    this.unwatch()
    super.destroy.call(this)
  }
}
