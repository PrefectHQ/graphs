import gsap from 'gsap'
import {
  BitmapText,
  Container,
  Sprite,
  TextMetrics,
  UPDATE_PRIORITY
} from 'pixi.js'
import { Ref, watch, WatchStopHandle } from 'vue'
import {
  GraphTimelineNode,
  GraphState,
  NodeLayoutRow,
  NodesLayout,
  NodeSelectionEvent
} from '@/models'
import {
  getBitmapFonts,
  timelineScale,
  getNodeBoxTextures,
  TimelineNodes,
  RoundedBorderRect,
  SubNodesToggle,
  timelineUpdateEvent,
  roundedBorderRectAnimationDuration,
  roundedBorderRectAnimationEase
} from '@/pixiFunctions'
import { colorToHex } from '@/utilities/style'

export const nodeClickEvents = {
  nodeDetails: 'nodeDetailsClick',
  subNodesToggle: 'subNodesToggleClick',
}
export const nodeResizeEvent = 'nodeResize'
export const nodeAnimationDurations = {
  fadeIn: 0.25,
  move: 0.5,
}
// The name giving to the box container, this is used by
// edges to determine their positions
export const timelineNodeBoxName = 'box'

// At which scale do node details become too hard to see and don't need to be drawn.
const nodeElementScaleCullingThreshold = 0.2
const nodeBoxSpriteNames = {
  startCap: 'startCap',
  endCap: 'endCap',
  body: 'body',
}

type TimelineNodeUpdatePositionProps = {
  skipAnimation?: boolean,
  includeXPos?: boolean,
}

type TimelineNodeProps = {
  nodeData: GraphTimelineNode,
  graphState: GraphState,
  layout: Ref<NodesLayout>,
  layoutRows: Ref<NodeLayoutRow[]>,
}

export class TimelineNode extends Container {
  public readonly nodeData
  private readonly graphState
  private readonly layout
  private readonly layoutRows

  private currentState: string
  private readonly hasSubNodes: boolean = false
  private readonly unWatchers: WatchStopHandle[] = []

  // the position must be initialized before it will update itself.
  public positionInitialized = false
  private nodeWidth
  private readonly nodeHeight
  private readonly boxCapWidth: number = 0
  private readonly box = new Container()

  private subNodesToggle: SubNodesToggle | undefined
  private subNodesToggleWidth = 0
  private isSubNodesToggleInBox: boolean = true

  private label: BitmapText | undefined
  private apxLabelWidth = 0
  private isLabelInBox = true

  private isSubNodesExpanded = false
  private subNodesOutline: RoundedBorderRect | undefined
  private subNodesContent: TimelineNodes | undefined
  private subNodesHeight = 0
  private subNodesContentTicker: (() => void) | null = null

  private isSelected = false
  private selectedRing: RoundedBorderRect | undefined

  public constructor({
    nodeData,
    graphState,
    layout,
    layoutRows,
  }: TimelineNodeProps) {
    super()

    this.interactive = false

    this.nodeData = nodeData
    this.graphState = graphState
    this.layout = layout
    this.layoutRows = layoutRows

    this.currentState = nodeData.state
    this.hasSubNodes = nodeData.subFlowRunId !== undefined
    this.boxCapWidth = graphState.styleOptions.value.borderRadiusNode
    this.nodeWidth = this.getNodeWidth()
    this.nodeHeight = this.getNodeHeight()

    this.initSubNodesOutline()
    this.initBox()
    this.initSubNodesToggle()
    this.drawLabel()
    this.initSelectedRing()

    this.initWatchers()
  }

  private initWatchers(): void {
    const { layoutRows } = this
    const {
      styleOptions,
      styleNode,
      selectedNodeId,
      subNodeLabels,
      expandedSubNodes,
      viewport,
    } = this.graphState

    this.unWatchers.push(
      watch(layoutRows, () => {
        if (this.positionInitialized) {
          this.updatePosition()
        }
      }),
      watch([styleOptions, styleNode], () => {
        this.drawBox()
        this.drawLabel()
      }, { deep: true }),
      watch(selectedNodeId, () => {
        const isCurrentSelection = selectedNodeId.value === this.nodeData.id
            || selectedNodeId.value === this.nodeData.subFlowRunId

        if (isCurrentSelection) {
          this.select()
          return
        }
        if (this.isSelected) {
          this.deselect()
        }
      }),
      watch(expandedSubNodes, () => {
        if (this.isSubNodesExpanded) {
          if (!expandedSubNodes.value.has(this.nodeData.id)) {
            this.isSubNodesExpanded = false
            this.collapseSubNodes()
            return
          }

          const newData = expandedSubNodes.value.get(this.nodeData.id)!.data
          this.subNodesContent?.update('value' in newData ? newData.value : newData)
          return
        }
        if (expandedSubNodes.value.has(this.nodeData.id)) {
          this.isSubNodesExpanded = true
          this.expandSubNodes()
        }
      }, { deep: true }),
    )

    if (this.hasSubNodes) {
      this.unWatchers.push(
        watch(subNodeLabels, () => {
          if (this.getLabelText() !== this.label?.text) {
            this.drawLabel(true)
          }
        }, { deep: true }),
      )
    }

    viewport.on('frame-end', () => {
      if (viewport.scale.x < nodeElementScaleCullingThreshold) {
        if (this.label) {
          this.label.visible = false
        }
        if (this.subNodesOutline && !this.isSubNodesExpanded) {
          this.subNodesOutline.visible = false
        }
        return
      }
      if (this.label) {
        this.label.visible = true
      }
      if (this.subNodesOutline) {
        this.subNodesOutline.visible = true
      }
    })
  }

  public readonly initializePosition = (): void => {
    this.positionInitialized = true
    this.updatePosition({ skipAnimation: true, includeXPos: true })
  }

  private initSubNodesOutline(): void {
    if (!this.hasSubNodes) {
      return
    }

    this.subNodesOutline?.destroy()

    const { nodeHeight, graphState } = this
    const { styleOptions, styleNode } = graphState
    const {
      borderRadiusNode,
      alphaSubNodesOutlineDimmed,
      spacingSubNodesOutlineBorderWidth,
      spacingSubNodesOutlineOffset,
    } = styleOptions.value
    const { fill } = styleNode.value(this.nodeData)
    const outlineColor = colorToHex(fill)

    const width = this.getOutlineWidth()

    this.subNodesOutline = new RoundedBorderRect({
      graphState,
      width,
      height: nodeHeight,
      borderRadius: borderRadiusNode,
      borderWidth: spacingSubNodesOutlineBorderWidth,
      borderColor: outlineColor,
    })
    this.subNodesOutline.position.set(
      spacingSubNodesOutlineOffset,
      spacingSubNodesOutlineOffset,
    )
    this.subNodesOutline.alpha = alphaSubNodesOutlineDimmed

    this.addChild(this.subNodesOutline)
  }

  private initBox(): void {
    const { box } = this
    box.name = timelineNodeBoxName
    this.drawBox()
    this.addChild(box)

    box.interactive = true
    box.buttonMode = true
    box.on('click', () => {
      this.emitSelection()
    })
    this.graphState.cull.add(box)
  }

  private drawBox(): void {
    const { pixiApp, styleOptions, styleNode } = this.graphState
    const { nodeWidth, nodeHeight, box, boxCapWidth } = this
    const { borderRadiusNode } = styleOptions.value
    const { fill } = styleNode.value(this.nodeData)
    const hexadecimalFill = colorToHex(fill)
    const isRunningNode = !this.nodeData.end

    this.box.removeChildren()

    const { cap, body } = getNodeBoxTextures({
      pixiApp,
      fill: hexadecimalFill,
      borderRadius: borderRadiusNode,
      boxCapWidth,
      height: nodeHeight,
    })

    const startCapSprite = new Sprite(cap)
    startCapSprite.name = nodeBoxSpriteNames.startCap

    const bodySprite = new Sprite(body)
    bodySprite.name = nodeBoxSpriteNames.body
    bodySprite.width = this.getBoxBodyWidth()
    bodySprite.height = nodeHeight
    bodySprite.position.set(boxCapWidth, 0)

    box.addChild(startCapSprite)
    box.addChild(bodySprite)

    if (!isRunningNode) {
      const endCapSprite = new Sprite(cap)
      endCapSprite.name = nodeBoxSpriteNames.endCap
      endCapSprite.scale.x = -1
      endCapSprite.position.x = nodeWidth

      box.addChild(endCapSprite)
    }
  }

  private initSubNodesToggle(): void {
    if (!this.hasSubNodes) {
      return
    }

    const { graphState, nodeWidth, nodeHeight, nodeData } = this
    const { spacingNodeLabelMargin, borderRadiusNode } = this.graphState.styleOptions.value

    this.subNodesToggleWidth = nodeHeight
    this.isSubNodesToggleInBox = nodeWidth > this.subNodesToggleWidth + borderRadiusNode

    this.subNodesToggle = new SubNodesToggle({
      graphState,
      nodeData,
      floating: !this.isSubNodesToggleInBox,
      size: this.subNodesToggleWidth,
    })
    this.subNodesToggle.position.x = this.isSubNodesToggleInBox
      ? 0
      : nodeWidth + spacingNodeLabelMargin

    this.subNodesToggle.on('click', () => {
      this.emit(nodeClickEvents.subNodesToggle, this.nodeData.id)
    })

    this.addChild(this.subNodesToggle)
  }

  private async drawLabel(newLabelText?: boolean): Promise<void> {
    const { apxLabelWidth, nodeData } = this
    const { styleOptions, styleNode, cull } = this.graphState

    const textStyles = await getBitmapFonts(styleOptions.value)
    const { spacingNodeXPadding } = styleOptions.value
    const { inverseTextOnFill } = styleNode.value(nodeData)
    const labelStyleOnFill = inverseTextOnFill ? textStyles.nodeTextInverse : textStyles.nodeTextDefault

    const labelText = this.getLabelText()

    if (apxLabelWidth === 0 || newLabelText) {
      // the text metrics are consistently a bit off, so we add a buffer percentage
      const labelWidthBufferPercentage = 7
      const apxLabelTextWidth =
        TextMetrics.measureText(labelText, textStyles.nodeTextStyles).width
        * (1 + labelWidthBufferPercentage / 100)

      this.apxLabelWidth = apxLabelTextWidth + spacingNodeXPadding * 2
    }

    this.isLabelInBox = this.checkIsLabelInBox()

    const labelStyle = this.isLabelInBox ? labelStyleOnFill : textStyles.nodeTextDefault

    if (this.label) {
      cull.remove(this.label)
      this.label.destroy()
    }

    this.label = new BitmapText(labelText, labelStyle)
    this.updateLabelPosition()

    if (!this.isLabelInBox) {
      this.label.interactive = true
      this.label.buttonMode = true
      this.label.on('click', () => {
        this.emitSelection()
      })
    }

    cull.add(this.label)
    this.addChild(this.label)
  }

  private initSelectedRing(): void {
    const { width, height, margin } = this.getSelectedRingSize()
    const {
      colorNodeSelection,
      spacingNodeSelectionWidth,
      borderRadiusNode,
    } = this.graphState.styleOptions.value

    this.selectedRing = new RoundedBorderRect({
      graphState: this.graphState,
      width,
      height,
      borderRadius: borderRadiusNode,
      borderColor: colorNodeSelection,
      borderWidth: spacingNodeSelectionWidth,
    })
    this.selectedRing.position.set(-margin, -margin)
    this.selectedRing.alpha = 0

    this.addChild(this.selectedRing)
  }

  /**
   * Node Selection
   */
  public select(): void {
    this.isSelected = true
    this.selectedRing!.alpha = 1

    this.centerViewportToNodeAfterDelay()
  }

  public deselect(): void {
    this.isSelected = false
    this.selectedRing!.alpha = 0

    if (!this.graphState.selectedNodeId.value) {
      this.centerViewportToNodeAfterDelay()
    }
  }

  private centerViewportToNodeAfterDelay(): void {
    const { viewport, suppressMotion } = this.graphState
    setTimeout(() => {
      const xPos = (this.worldTransform.tx - viewport.x) / viewport.scale.x + this.box.width / 2
      const yPos = (this.worldTransform.ty - viewport.y) / viewport.scale.y + this.box.height / 2

      viewport.animate({
        position: {
          x: xPos,
          y: yPos,
        },
        time: suppressMotion.value ? 0 : 1000,
        ease: 'easeInOutQuad',
        removeOnInterrupt: true,
      })
    }, 100)
  }

  /**
   * Subnodes
   */
  public expandSubNodes(): void {
    const subNodeContent = this.graphState.expandedSubNodes.value.get(this.nodeData.id)

    if (!this.hasSubNodes || !subNodeContent) {
      return
    }

    const subNodesData = 'value' in subNodeContent.data ? subNodeContent.data.value : subNodeContent.data

    this.subNodesToggle?.setExpanded()

    this.subNodesContent?.destroy()

    this.subNodesContent = new TimelineNodes({
      isSubNodes: true,
      graphData: subNodesData,
      graphState: this.graphState,
    })

    this.subNodesContent.on(nodeClickEvents.nodeDetails, (nodeSelectionValue) => {
      this.emit(nodeClickEvents.nodeDetails, nodeSelectionValue)
    })
    this.subNodesContent.on(nodeClickEvents.subNodesToggle, (id) => {
      this.emit(nodeClickEvents.subNodesToggle, id)
    })

    this.updateSubNodesContentPosition()
    this.subNodesContent.on(timelineUpdateEvent, () => this.updateSubNodesContentPosition())

    this.addChild(this.subNodesContent)

    this.initSubNodesTicker()
  }

  public updateSubNodesContentPosition(): void {
    const { subNodesContent, box } = this
    const { spacingNodeMargin } = this.graphState.styleOptions.value

    if (!subNodesContent) {
      return
    }

    // The subNodes nodes are positioned relative to the global timeline, but we're drawing
    // the subNodes container relative to this node, so we need to offset the X to compensate.
    const earliestSubNodes = subNodesContent.getEarliestNodeStart()
    const xPosNegativeOffset = earliestSubNodes ? -timelineScale.dateToX(earliestSubNodes) : 0

    const yPos = box.y + box.height + spacingNodeMargin

    subNodesContent.position.set(
      xPosNegativeOffset,
      yPos,
    )
  }

  private initSubNodesTicker(): void {
    const { subNodesContent } = this
    const { pixiApp } = this.graphState

    if (!subNodesContent) {
      return
    }

    this.subNodesHeight = subNodesContent.height

    this.subNodesContentTicker = () => {
      if (this.subNodesContent?.height !== this.subNodesHeight) {
        this.updateSubNodesOutlineSize()
        this.updateSelectedRingSize()
        this.subNodesHeight = subNodesContent.height
        this.emit(nodeResizeEvent)
      }
    }
    pixiApp.ticker.add(
      this.subNodesContentTicker,
      null, UPDATE_PRIORITY.LOW,
    )
  }

  public async collapseSubNodes(): Promise<void> {
    this.isSubNodesExpanded = false

    this.subNodesToggle?.setCollapsed()

    this.destroySubNodesContent()

    this.updateSelectedRingSize()
    await this.updateSubNodesOutlineSize()

    this.emit(nodeResizeEvent)
  }

  /**
   * Update Functions
   */
  public update(hasUpdatedData?: boolean): void {
    let hasNewState = false
    let hasNewLabelText = false


    if (hasUpdatedData) {
      hasNewState = this.currentState !== this.nodeData.state
      this.currentState = this.nodeData.state

      hasNewLabelText = this.label?.text !== this.nodeData.label
    }

    const nodeWidth = this.getNodeWidth()

    if (hasNewState) {
      this.drawBox()
      this.initSubNodesOutline()
    }

    if (hasNewLabelText) {
      this.drawLabel()
    }

    if (nodeWidth !== this.nodeWidth) {
      this.nodeWidth = nodeWidth

      this.updateBoxWidth()
      this.updateSelectedRingSize()
      if (this.subNodesOutline) {
        this.updateSubNodesOutlineSize(true)
      }

      // 2px tolerance avoids the label bouncing in/out of the box
      const isLabelInBoxChanged = this.isLabelInBox !== this.checkIsLabelInBox(2)

      if (!hasNewLabelText && isLabelInBoxChanged) {
        this.drawLabel()
      } else if (!this.isLabelInBox) {
        this.updateLabelPosition()
      }
    }
  }

  private updatePosition(options?: TimelineNodeUpdatePositionProps): void {
    const {
      skipAnimation,
      includeXPos,
    } = options ?? {}
    const { suppressMotion } = this.graphState
    const { id } = this.nodeData
    const { position } = this.layout.value[id]

    if (!this.layoutRows.value[position]) {
      return
    }

    const { yPos } = this.layoutRows.value[position]
    const xPos = includeXPos ? timelineScale.dateToX(this.nodeData.start) : this.position.x

    if (this.position.y === yPos && this.position.x === xPos) {
      return
    }

    if (skipAnimation || suppressMotion.value) {
      this.position.set(xPos, yPos)
      return
    }

    gsap.to(this, {
      x: xPos,
      y: yPos,
      duration: nodeAnimationDurations.move,
      ease: 'power1.out',
    }).then(() => {
      this.graphState.cullScreen()
    })
  }

  private updateBoxWidth(): void {
    this.box.children.forEach((child) => {
      const childName = child.name
      switch (childName) {
        case nodeBoxSpriteNames.body:
          child.scale.x = this.getBoxBodyWidth()
          break
        case nodeBoxSpriteNames.endCap:
          child.position.set(this.nodeWidth, this.nodeHeight)
          break
        default:
          break
      }
    })
  }

  private async updateSubNodesOutlineSize(skipAnimation?: boolean): Promise<void> {
    if (!this.subNodesOutline) {
      return
    }

    const {
      isSubNodesExpanded,
      subNodesContent,
      subNodesOutline,
      nodeHeight,
    } = this
    const {
      spacingSubNodesOutlineOffset,
      alphaSubNodesOutlineDimmed,
      spacingNodeMargin,
    } = this.graphState.styleOptions.value
    const { suppressMotion } = this.graphState

    const width = this.getOutlineWidth()
    const height = isSubNodesExpanded
      ? nodeHeight + subNodesContent!.height + spacingNodeMargin
      : nodeHeight

    subNodesOutline.resize({
      width,
      height,
      animate: true,
    })

    await new Promise((resolve) => {
      const duration = skipAnimation || suppressMotion.value ? 0 : roundedBorderRectAnimationDuration

      if (isSubNodesExpanded) {
        gsap.to(subNodesOutline, {
          x: -spacingSubNodesOutlineOffset,
          y: -spacingSubNodesOutlineOffset,
          alpha: 1,
          duration,
          ease: roundedBorderRectAnimationEase,
        }).then(() => resolve(null))
      } else {
        gsap.to(subNodesOutline, {
          x: spacingSubNodesOutlineOffset,
          y: spacingSubNodesOutlineOffset,
          alpha: alphaSubNodesOutlineDimmed,
          duration,
          ease: roundedBorderRectAnimationEase,
        }).then(() => resolve(null))
      }
    })
  }

  private updateLabelPosition(): void {
    if (!this.label) {
      return
    }

    const {
      graphState,
      nodeWidth,
      hasSubNodes,
      isSubNodesToggleInBox,
      subNodesToggleWidth,
    } = this
    const {
      spacingNodeXPadding,
      spacingNodeLabelMargin,
      spacingNodeYPadding,
    } = graphState.styleOptions.value

    const floatingLabelPosition = (): number => hasSubNodes && !isSubNodesToggleInBox
      ? nodeWidth + spacingNodeLabelMargin + subNodesToggleWidth + spacingNodeXPadding
      : nodeWidth + spacingNodeLabelMargin

    const inBoxLabelPosition = (): number => hasSubNodes && isSubNodesToggleInBox
      ? subNodesToggleWidth + spacingNodeXPadding
      : spacingNodeXPadding

    const labelXPos = this.isLabelInBox ? inBoxLabelPosition() : floatingLabelPosition()

    this.label.position.set(labelXPos, spacingNodeYPadding)
  }

  private updateSelectedRingSize(): void {
    const { width, height } = this.getSelectedRingSize()
    this.selectedRing!.resize({ width, height })
  }

  /**
   * Utilities
   */
  private getNodeWidth(): number {
    const minimumWidth = this.boxCapWidth * 2
    const actualWidth = timelineScale.dateToX(this.nodeData.end ?? new Date()) - timelineScale.dateToX(this.nodeData.start)

    return actualWidth > minimumWidth ? actualWidth : minimumWidth
  }

  private getNodeHeight(): number {
    const {
      textLineHeightDefault,
      spacingNodeYPadding,
    } = this.graphState.styleOptions.value

    return textLineHeightDefault + spacingNodeYPadding * 2
  }

  private getBoxBodyWidth(): number {
    const { nodeData, nodeWidth, boxCapWidth } = this
    const isRunningNode = !nodeData.end
    return isRunningNode
      ? nodeWidth - boxCapWidth
      : nodeWidth - boxCapWidth * 2
  }

  private getOutlineWidth(): number {
    const { nodeWidth, isSubNodesExpanded } = this
    const { spacingSubNodesOutlineOffset } = this.graphState.styleOptions.value

    const minimumWidth = this.boxCapWidth * 2
    const width = nodeWidth - spacingSubNodesOutlineOffset * 2
    const collapsedWidth = width >= minimumWidth ? width : minimumWidth

    return isSubNodesExpanded ? width : collapsedWidth
  }

  private getLabelText(): string {
    if (!this.hasSubNodes) {
      return this.nodeData.label
    }

    const { subNodeLabels } = this.graphState
    const { subFlowRunId } = this.nodeData

    return subNodeLabels.value.has(subFlowRunId!)
      ? subNodeLabels.value.get(subFlowRunId!)!
      : this.nodeData.label
  }

  private checkIsLabelInBox(tolerance: number = 0): boolean {
    const { hasSubNodes, isSubNodesToggleInBox, subNodesToggle } = this

    return hasSubNodes && isSubNodesToggleInBox
      ? this.apxLabelWidth + tolerance < this.nodeWidth - subNodesToggle!.width
      : this.apxLabelWidth + tolerance < this.nodeWidth
  }

  private getSelectedRingSize(): { width: number, height: number, margin: number } {
    const { nodeWidth, nodeHeight, hasSubNodes, isSubNodesExpanded } = this
    const {
      spacingNodeSelectionMargin,
      spacingNodeSelectionWidth,
      spacingSubNodesOutlineBorderWidth,
      spacingSubNodesOutlineOffset,
    } = this.graphState.styleOptions.value

    // The margin compensates for RoundedBorderRect using an inset border
    const margin = spacingNodeSelectionMargin + spacingNodeSelectionWidth

    const width = nodeWidth + margin * 2
    const height = hasSubNodes && !isSubNodesExpanded
      ? nodeHeight + spacingSubNodesOutlineBorderWidth + spacingSubNodesOutlineOffset + margin * 2
      : nodeHeight + margin * 2

    return { width, height, margin }
  }

  private emitSelection(): void {
    const { id, subFlowRunId } = this.nodeData

    const nodeSelectionEvent: NodeSelectionEvent = {
      id: this.hasSubNodes ? subFlowRunId! : id,
      type: this.hasSubNodes ? 'subFlow' : 'task',
    }

    this.emit(nodeClickEvents.nodeDetails, nodeSelectionEvent)
  }

  private destroySubNodesContent(): void {
    if (this.subNodesContentTicker) {
      this.graphState.pixiApp.ticker.remove(this.subNodesContentTicker)
      this.subNodesContentTicker = null
    }

    this.subNodesContent?.destroy()
  }

  public destroy(): void {
    const { cull } = this.graphState
    cull.remove(this.box)
    if (this.label) {
      cull.remove(this.label)
    }

    if (this.isSelected) {
      this.emit(nodeClickEvents.nodeDetails, null)
    }

    this.destroySubNodesContent()

    this.subNodesOutline?.destroy()
    this.box.destroy()
    this.subNodesToggle?.destroy()
    this.label?.destroy()
    this.selectedRing?.destroy()

    this.unWatchers.forEach(unwatch => unwatch())

    super.destroy.call(this)
  }
}
