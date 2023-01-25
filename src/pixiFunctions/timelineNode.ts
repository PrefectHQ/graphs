import gsap from 'gsap'
import {
  BitmapText,
  Container,
  Graphics,
  TextMetrics
} from 'pixi.js'
import { ComputedRef, watch, WatchStopHandle } from 'vue'
import { getBitmapFonts } from './bitmapFonts'
import { timelineScale } from './timelineScale'
import {
  ParsedThemeStyles,
  TimelineNodeData,
  NodeThemeFn
} from '@/models'
import { colorToHex } from '@/utilities/style'

type TimelineNodeProps = {
  nodeData: TimelineNodeData,
  styles: ComputedRef<ParsedThemeStyles>,
  styleNode: ComputedRef<NodeThemeFn>,
  layoutPosition: number,
}

const animationDurations = {
  fadeIn: 0.25,
  move: 0.5,
}

export const timelineNodeBoxName = 'box'

export class TimelineNode extends Container {
  public nodeData
  private readonly styles
  private readonly styleNode

  private readonly unwatch: WatchStopHandle

  private label: BitmapText | undefined
  private readonly box = new Graphics()

  private apxLabelWidth = 0
  private nodeWidth
  private readonly layoutPositionOffset
  public layoutPosition
  private isLabelInBox = true

  private readonly selectedRing = new Graphics()

  public constructor({
    nodeData,
    styles,
    styleNode,
    layoutPosition,
  }: TimelineNodeProps) {
    super()
    this.nodeData = nodeData
    this.styles = styles
    this.styleNode = styleNode
    this.layoutPosition = layoutPosition

    this.alpha = 0

    this.nodeWidth = this.getNodeWidth()
    this.layoutPositionOffset = this.getLayoutPositionOffset()

    this.box.name = timelineNodeBoxName
    this.drawBox()
    this.addChild(this.box)

    this.drawLabel()

    this.drawSelectedRing()

    this.updatePosition(true)

    this.unwatch = watch([styles, styleNode], () => {
      this.box.clear()
      this.drawBox()
    }, { deep: true })

    this.interactive = true
    this.buttonMode = true

    this.animateIn()
  }

  private getNodeWidth(): number {
    return timelineScale.dateToX(this.nodeData.end ?? new Date()) - timelineScale.dateToX(this.nodeData.start)
  }

  private getLayoutPositionOffset(): number {
    const { textLineHeightDefault, spacingNodeYPadding, spacingNodeMargin } = this.styles.value
    const nodeHeight = textLineHeightDefault + spacingNodeYPadding * 2

    return nodeHeight + spacingNodeMargin
  }

  private drawBox(): void {
    const { fill } = this.styleNode.value(this.nodeData)
    const hexadecimalFill = colorToHex(fill)
    const {
      textLineHeightDefault,
      spacingNodeYPadding,
      borderRadiusNode,
    } = this.styles.value

    const width = this.nodeWidth >= 1 ? this.nodeWidth : 1
    const height = textLineHeightDefault + spacingNodeYPadding * 2

    this.box.beginFill(hexadecimalFill)
    this.box.drawRoundedRect(
      0,
      0,
      width,
      height,
      borderRadiusNode,
    )
    this.box.endFill()
  }

  private async drawLabel(): Promise<void> {
    const textStyles = await getBitmapFonts(this.styles.value)
    const { inverseTextOnFill } = this.styleNode.value(this.nodeData)
    const { spacingNodeXPadding } = this.styles.value

    if (this.apxLabelWidth === 0) {
      this.apxLabelWidth = TextMetrics.measureText(this.nodeData.label, textStyles.nodeTextStyles).width
    }

    this.label?.destroy()

    if (this.apxLabelWidth + spacingNodeXPadding * 2 > this.nodeWidth) {
      this.isLabelInBox = false
      this.label = new BitmapText(this.nodeData.label, textStyles.nodeTextDefault)
    } else {
      const styleForLabelInBox = inverseTextOnFill ? textStyles.nodeTextInverse : textStyles.nodeTextDefault
      this.isLabelInBox = true
      this.label = new BitmapText(this.nodeData.label, styleForLabelInBox)
    }

    this.updateLabelPosition()

    this.addChild(this.label)
  }

  private drawSelectedRing(): void {
    const {
      colorNodeSelection,
      spacingNodeSelectionMargin,
      spacingNodeSelectionWidth,
      borderRadiusNode,
    } = this.styles.value

    this.selectedRing.lineStyle(
      spacingNodeSelectionWidth,
      colorNodeSelection,
      1,
      1,
    )
    this.selectedRing.drawRoundedRect(
      -spacingNodeSelectionMargin,
      -spacingNodeSelectionMargin,
      this.nodeWidth + spacingNodeSelectionMargin * 2,
      this.box.height + spacingNodeSelectionMargin * 2,
      borderRadiusNode,
    )

    this.selectedRing.alpha = 0

    this.addChild(this.selectedRing)
  }

  private animateIn(): void {
    gsap.to(this, { alpha: 1, duration: animationDurations.fadeIn })
  }

  public async updatePosition(skipAnimation?: boolean): Promise<void> {
    const xPos = timelineScale.dateToX(this.nodeData.start)
    const yPos = this.layoutPosition * this.layoutPositionOffset

    if (skipAnimation) {
      this.position.set(xPos, yPos)
      return
    }

    await new Promise((resolve) => {
      gsap.to(this, {
        x: xPos,
        // eslint-disable-next-line id-length
        y: yPos,
        duration: animationDurations.move,
        ease: 'power1.out',
      }).then(() => {
        resolve(null)
      })
    })
  }

  private updateLabelPosition(): void {
    const {
      spacingNodeXPadding,
      spacingNodeYPadding,
      spacingNodeLabelMargin,
    } = this.styles.value

    this.label?.position.set(
      this.isLabelInBox
        ? spacingNodeXPadding
        : this.nodeWidth + spacingNodeLabelMargin,
      spacingNodeYPadding,
    )
  }

  public async update(newNodeData?: TimelineNodeData): Promise<void> {
    let hasNewState = false

    if (newNodeData) {
      hasNewState = newNodeData.state !== this.nodeData.state
      this.nodeData = newNodeData
    }

    const nodeWidth = this.getNodeWidth()

    if (hasNewState || nodeWidth !== this.nodeWidth) {
      this.nodeWidth = nodeWidth

      this.box.clear()
      this.drawBox()

      if (
        // 2px tolerance avoids the label bouncing in/out of the box
        this.isLabelInBox && this.apxLabelWidth > this.nodeWidth + 2
        || !this.isLabelInBox && this.apxLabelWidth < this.nodeWidth - 2
      ) {
        this.drawLabel()
      } else if (!this.isLabelInBox) {
        this.updateLabelPosition()
      }
    }

    await this.updatePosition()
  }

  public select(): void {
    this.selectedRing.alpha = 1
  }

  public deselect(): void {
    this.selectedRing.alpha = 0
  }

  public destroy(): void {
    this.unwatch()
    super.destroy.call(this)
  }
}
