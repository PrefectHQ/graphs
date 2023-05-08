import gsap from 'gsap'
import {
  BitmapText,
  Container,
  Sprite,
  TextMetrics,
  UPDATE_PRIORITY
} from 'pixi.js'
import { Ref, unref, watch, WatchStopHandle } from 'vue'
import {
  GraphState,
  NodeLayoutRow,
  NodesLayout,
  NodeSelectionEvent
} from '@/models'
import {
  getBitmapFonts,
  getNodeBoxTextures,
  TimelineNodes,
  RoundedBorderRect,
  SubNodesToggle,
  timelineUpdateEvent,
  roundedBorderRectAnimationDuration,
  roundedBorderRectAnimationEase,
  LoadingIndicator
} from '@/pixiFunctions'
import { TimelineData, TimelineItem } from '@/types/timeline'
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

const noSubNodesMessageText = 'None'
// At which scale do node details become too hard to see and don't need to be drawn.
const nodeElementScaleCullingThreshold = 0.2

type TimelineNodeUpdatePositionProps = {
  skipAnimation?: boolean,
  includeXPos?: boolean,
}

type TimelineNodeProps = {
  nodeData: TimelineItem,
  state: GraphState,
  layout: Ref<NodesLayout>,
  layoutRows: Ref<NodeLayoutRow[]>,
}

export class TimelineNode extends Container {
  public nodeData
  private readonly state
  private readonly layout
  private readonly layoutRows

  private currentState: string
  private readonly hasSubNodes: boolean = false
  private isRunningNode: boolean = false
  private runningNodeTicker: (() => void) | null = null
  private readonly unWatchers: WatchStopHandle[] = []

  // the position must be initialized before it will update itself.
  public positionInitialized = false
  private nodeWidth
  private readonly nodeHeight

  private readonly boxCapWidth: number = 0
  private readonly box = new Container()
  private leftBoxCap: Sprite | undefined
  private rightBoxCap: Sprite | undefined
  private boxBody: Sprite | undefined

  private subNodesToggle: SubNodesToggle | undefined
  private subNodesToggleWidth = 0
  private isSubNodesToggleFloating: boolean = false
  private isLoadingSubNodes: boolean = false
  private subNodesLoadingIndicator: LoadingIndicator | null = null
  private noSubNodesMessage: BitmapText | null = null

  private label: BitmapText | undefined
  private apxLabelWidth = 0
  private isLabelInBox = true

  private isSubNodesExpanded = false
  private readonly subNodesOutlineContainer = new Container()
  private subNodesOutline: RoundedBorderRect | undefined
  private subNodesContent: TimelineNodes | null = null
  private subNodesHeight = 0
  private subNodesContentTicker: (() => void) | null = null

  private isSelected = false
  private selectedRing: RoundedBorderRect | undefined

  public constructor({
    nodeData,
    state,
    layout,
    layoutRows,
  }: TimelineNodeProps) {
    super()

    this.interactive = false

    this.nodeData = nodeData
    this.state = state
    this.layout = layout
    this.layoutRows = layoutRows

    this.currentState = nodeData.state.toString()
    this.hasSubNodes = nodeData.subflowRunId !== null
    this.updateIsRunningNode()

    this.boxCapWidth = state.styleOptions.value.borderRadiusNode
    this.nodeWidth = this.getNodeWidth()
    this.nodeHeight = this.getNodeHeight()

    this.addChild(this.subNodesOutlineContainer)
    this.drawSubNodesOutline()

    this.initBox()
    this.initSubNodesToggle()
    this.drawLabel()
    this.initSelectedRing()

    this.initWatchers()
  }

  private initWatchers(): void {
    const {
      layoutRows,
      unWatchers,
      hasSubNodes,
      isRunningNode,
    } = this
    const {
      pixiApp,
      styleOptions,
      styleNode,
      selectedNodeId,
      subNodeLabels,
      expandedSubNodes,
      viewport,
    } = this.state

    unWatchers.push(
      watch(layoutRows, () => {
        this.updatePosition()
      }),
      watch([styleOptions, styleNode], () => {
        this.drawBox()
        this.drawLabel()

        if (this.noSubNodesMessage) {
          this.drawNoSubNodesMessage()
        }
      }, { deep: true }),
      watch(selectedNodeId, () => {
        const isCurrentSelection = selectedNodeId.value === this.nodeData.id
            || selectedNodeId.value === this.nodeData.subflowRunId

        if (isCurrentSelection) {
          this.select()
          return
        }
        if (this.isSelected) {
          this.deselect()
        }
      }),
    )

    if (hasSubNodes) {
      unWatchers.push(
        watch(expandedSubNodes, () => {
          if (!this.nodeData.subflowRunId) {
            return
          }

          if (!this.isSubNodesExpanded && expandedSubNodes.value.has(this.nodeData.subflowRunId)) {
            this.isSubNodesExpanded = true
            this.subNodesToggle?.setExpanded()

            const subNodesData = this.getSubNodesData()

            if (subNodesData.size === 0 && !this.isLoadingSubNodes) {
              this.isLoadingSubNodes = true
              this.drawLoadingSubNodes()
              return
            }

            this.expandSubNodes()
            return
          }

          if (this.isSubNodesExpanded) {
            if (!expandedSubNodes.value.has(this.nodeData.subflowRunId)) {
              this.subNodesToggle?.setCollapsed()

              this.isSubNodesExpanded = false
              this.isLoadingSubNodes = false

              this.collapseSubNodes()
              return
            }

            const newData = this.getSubNodesData()

            if (this.isLoadingSubNodes) {
              this.isLoadingSubNodes = false
              this.destroySubNodesLoadingIndicator()
              if (newData.size === 0) {
                this.drawNoSubNodesMessage()
                return
              }
            }

            if (!this.subNodesContent) {
              this.expandSubNodes()
              return
            }

            this.subNodesContent.update(newData)
          }
        }, { deep: true }),
        watch(subNodeLabels, () => {
          if (this.getLabelText() !== this.label?.text) {
            this.drawLabel(true)
          }
        }, { deep: true }),
      )
    }

    if (isRunningNode) {
      this.runningNodeTicker = () => {
        this.update()
      }

      pixiApp.ticker.add(this.runningNodeTicker)
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

  private drawSubNodesOutline(): void {
    if (!this.hasSubNodes) {
      return
    }

    this.subNodesOutline?.destroy()

    const { nodeHeight, state: graphState } = this
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

    this.subNodesOutlineContainer.addChild(this.subNodesOutline)
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
    this.state.cull.add(box)
  }

  private drawBox(): void {
    const { pixiApp, styleOptions, styleNode } = this.state
    const { isRunningNode, nodeWidth, nodeHeight, box, boxCapWidth } = this
    const { borderRadiusNode } = styleOptions.value
    const { fill } = styleNode.value(this.nodeData)
    const hexadecimalFill = colorToHex(fill)

    this.leftBoxCap?.destroy()
    this.boxBody?.destroy()
    this.rightBoxCap?.destroy()
    this.box.removeChildren()

    const { cap, body } = getNodeBoxTextures({
      pixiApp,
      fill: hexadecimalFill,
      borderRadius: borderRadiusNode,
      boxCapWidth,
      height: nodeHeight,
    })

    this.leftBoxCap = new Sprite(cap)

    this.boxBody = new Sprite(body)
    this.boxBody.width = this.getBoxBodyWidth()
    this.boxBody.height = nodeHeight
    this.boxBody.position.set(boxCapWidth, 0)

    box.addChild(this.leftBoxCap)
    box.addChild(this.boxBody)

    if (!isRunningNode) {
      this.rightBoxCap = new Sprite(cap)
      this.rightBoxCap.scale.x = -1
      this.rightBoxCap.position.x = nodeWidth

      box.addChild(this.rightBoxCap)
    }
  }

  private initSubNodesToggle(): void {
    if (!this.hasSubNodes) {
      return
    }

    const { state: graphState, nodeWidth, nodeHeight, nodeData } = this
    const { spacingNodeLabelMargin, borderRadiusNode } = this.state.styleOptions.value

    this.subNodesToggleWidth = nodeHeight
    this.isSubNodesToggleFloating = this.subNodesToggleWidth + borderRadiusNode > nodeWidth

    this.subNodesToggle = new SubNodesToggle({
      graphState,
      nodeData,
      floating: this.isSubNodesToggleFloating,
      size: this.subNodesToggleWidth,
    })
    this.subNodesToggle.position.x = this.isSubNodesToggleFloating
      ? nodeWidth + spacingNodeLabelMargin
      : 0

    this.subNodesToggle.on('click', () => {
      this.emitSubNodesToggle()
    })

    this.addChild(this.subNodesToggle)
  }

  private async drawLabel(newLabelText?: boolean): Promise<void> {
    const { apxLabelWidth, nodeData } = this
    const { styleOptions, styleNode, cull } = this.state

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
    } = this.state.styleOptions.value

    this.selectedRing = new RoundedBorderRect({
      graphState: this.state,
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

    if (!this.state.selectedNodeId.value) {
      this.centerViewportToNodeAfterDelay()
    }
  }

  private centerViewportToNodeAfterDelay(): void {
    const { viewport, suppressMotion } = this.state
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
  private expandSubNodes(): void {
    if (!this.nodeData.subflowRunId) {
      return
    }

    const subNodeContent = this.state.expandedSubNodes.value.get(this.nodeData.subflowRunId)

    if (!this.hasSubNodes || !subNodeContent) {
      return
    }

    const subNodesData = unref(subNodeContent.data)

    this.subNodesContent?.destroy()

    this.subNodesContent = new TimelineNodes({
      isSubNodes: true,
      data: subNodesData,
      state: this.state,
    })

    this.subNodesContent.on(nodeClickEvents.nodeDetails, (nodeSelectionValue) => {
      this.emit(nodeClickEvents.nodeDetails, nodeSelectionValue)
    })
    this.subNodesContent.on(nodeClickEvents.subNodesToggle, (id) => {
      this.emitSubNodesToggle(id)
    })

    this.updateSubNodesContentPosition()
    this.subNodesContent.on(timelineUpdateEvent, () => this.updateSubNodesContentPosition())

    this.addChild(this.subNodesContent)

    this.initSubNodesTicker()
  }

  private drawLoadingSubNodes(): void {
    const { state: graphState, box } = this
    const { spacingNodeMargin } = graphState.styleOptions.value

    this.destroySubNodesLoadingIndicator()

    this.subNodesLoadingIndicator = new LoadingIndicator({ graphState })
    this.subNodesLoadingIndicator.position.set(
      box.width / 2 - this.subNodesLoadingIndicator.width / 2,
      box.y + box.height + spacingNodeMargin,
    )

    this.addChild(this.subNodesLoadingIndicator)

    this.initSubNodesTicker()
  }

  private async drawNoSubNodesMessage(): Promise<void> {
    const { box } = this
    const { styleOptions } = this.state
    const textStyles = await getBitmapFonts(styleOptions.value)

    this.destroyNoSubNodesMessage()

    this.noSubNodesMessage = new BitmapText(noSubNodesMessageText, textStyles.nodeTextSubdued)
    this.noSubNodesMessage.anchor.set(0.5, 0)
    this.noSubNodesMessage.position.set(
      box.width / 2,
      box.y + box.height + styleOptions.value.spacingNodeMargin,
    )

    this.addChild(this.noSubNodesMessage)

    this.initSubNodesTicker()
  }

  private updateSubNodesContentPosition(): void {
    const { subNodesContent, box } = this
    const { spacingNodeMargin } = this.state.styleOptions.value

    if (!subNodesContent) {
      return
    }

    // The subNodes nodes are positioned relative to the global timeline, but we're drawing
    // the subNodes container relative to this node, so we need to offset the X to compensate.
    const earliestSubNodes = subNodesContent.getEarliestNodeStart()
    const xPosNegativeOffset = earliestSubNodes ? -this.state.timeScale.dateToX(earliestSubNodes) : 0

    const yPos = box.y + box.height + spacingNodeMargin

    subNodesContent.position.set(
      xPosNegativeOffset,
      yPos,
    )
  }

  private initSubNodesTicker(): void {
    const { pixiApp } = this.state

    if (this.subNodesContentTicker) {
      return
    }

    this.subNodesHeight = 0

    this.subNodesContentTicker = () => {
      const newSubNodesHeight = this.getSubContentHeight()

      if (newSubNodesHeight !== this.subNodesHeight) {
        this.updateSubNodesOutlineSize()
        this.updateSelectedRingSize()
        this.subNodesHeight = newSubNodesHeight
        this.emit(nodeResizeEvent)
      }
    }
    pixiApp.ticker.add(
      this.subNodesContentTicker,
      null, UPDATE_PRIORITY.LOW,
    )
  }

  private async collapseSubNodes(): Promise<void> {
    this.destroySubNodesContent()

    this.updateSelectedRingSize()
    await this.updateSubNodesOutlineSize()

    this.emit(nodeResizeEvent)
  }

  /**
   * Update Functions
   */
  public update(newData?: TimelineItem): void {
    let hasNewState = false
    let hasNewLabelText = false

    if (newData) {
      this.nodeData = newData

      hasNewState = this.currentState !== this.nodeData.state
      this.currentState = this.nodeData.state.toString()

      this.updateIsRunningNode()

      hasNewLabelText = this.label?.text !== this.nodeData.label
    }

    if (this.isRunningNode && this.nodeData.end) {
      this.isRunningNode = false
      this.destroyRunningNodeTicker()
    }

    const nodeWidth = this.getNodeWidth()

    if (hasNewState) {
      this.drawBox()
      this.drawSubNodesOutline()
    }

    if (hasNewLabelText) {
      this.drawLabel()
    }

    if (nodeWidth !== this.nodeWidth) {
      this.nodeWidth = nodeWidth

      this.updateBoxWidth()
      this.updateSelectedRingSize()
      this.updateSubNodesOutlineSize(true)
      this.updateSubNodesTogglePosition()

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
    if (!this.positionInitialized || !this.nodeData.start) {
      return
    }

    const {
      skipAnimation,
      includeXPos,
    } = options ?? {}
    const { suppressMotion } = this.state
    const { id } = this.nodeData
    const { row } = this.layout.value[id]

    if (!this.layoutRows.value[row]) {
      return
    }

    const { yPos } = this.layoutRows.value[row]
    const xPos = includeXPos ? this.state.timeScale.dateToX(this.nodeData.start) : this.position.x

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
      this.state.cullScreen()
    })
  }

  private updateIsRunningNode(): void {
    this.isRunningNode = this.state.isRunning.value && !this.nodeData.end
  }

  private updateBoxWidth(): void {
    this.boxBody!.width = this.getBoxBodyWidth()
    this.rightBoxCap?.position.set(this.nodeWidth, 0)
  }

  private async updateSubNodesOutlineSize(skipAnimation?: boolean): Promise<void> {
    if (!this.subNodesOutline) {
      return
    }

    const {
      isSubNodesExpanded,
      subNodesOutline,
      nodeHeight,
    } = this
    const {
      spacingSubNodesOutlineOffset,
      alphaSubNodesOutlineDimmed,
      spacingNodeMargin,
    } = this.state.styleOptions.value
    const { suppressMotion } = this.state

    const width = this.getOutlineWidth()
    const height = isSubNodesExpanded
      ? nodeHeight + this.getSubContentHeight() + spacingNodeMargin
      : nodeHeight

    subNodesOutline.resize({
      width,
      height,
      animate: true,
    })

    await new Promise((resolve) => {
      const duration = skipAnimation || suppressMotion.value ? 0 : roundedBorderRectAnimationDuration
      const xPos = isSubNodesExpanded ? -spacingSubNodesOutlineOffset : spacingSubNodesOutlineOffset
      const yPos = isSubNodesExpanded ? -spacingSubNodesOutlineOffset : spacingSubNodesOutlineOffset
      const alpha = isSubNodesExpanded ? 1 : alphaSubNodesOutlineDimmed

      if (skipAnimation || suppressMotion.value) {
        subNodesOutline.position.set(xPos, yPos)
        subNodesOutline.alpha = alpha
        resolve(null)
        return
      }

      gsap.to(subNodesOutline, {
        x: xPos,
        y: yPos,
        alpha,
        duration,
        ease: roundedBorderRectAnimationEase,
      }).then(() => resolve(null))
    })
  }

  private updateLabelPosition(): void {
    if (!this.label) {
      return
    }

    const {
      state: graphState,
      nodeWidth,
      hasSubNodes,
      isSubNodesToggleFloating,
      subNodesToggleWidth,
    } = this
    const {
      spacingNodeXPadding,
      spacingNodeLabelMargin,
      spacingNodeYPadding,
    } = graphState.styleOptions.value

    const floatingLabelPosition = (): number => hasSubNodes && isSubNodesToggleFloating
      ? nodeWidth + spacingNodeLabelMargin + subNodesToggleWidth + spacingNodeXPadding
      : nodeWidth + spacingNodeLabelMargin

    const inBoxLabelPosition = (): number => hasSubNodes && !isSubNodesToggleFloating
      ? subNodesToggleWidth + spacingNodeXPadding
      : spacingNodeXPadding

    const labelXPos = this.isLabelInBox ? inBoxLabelPosition() : floatingLabelPosition()

    this.label.position.set(labelXPos, spacingNodeYPadding)
  }

  private updateSelectedRingSize(): void {
    const { width, height } = this.getSelectedRingSize()
    this.selectedRing!.resize({ width, height })
  }

  private updateSubNodesTogglePosition(): void {
    if (!this.subNodesToggle) {
      return
    }

    const { nodeWidth } = this
    const { borderRadiusNode, spacingNodeLabelMargin } = this.state.styleOptions.value

    this.isSubNodesToggleFloating = this.subNodesToggleWidth + borderRadiusNode > nodeWidth
    this.subNodesToggle.updateFloatingState(this.isSubNodesToggleFloating)

    this.subNodesToggle.position.x = this.isSubNodesToggleFloating
      ? nodeWidth + spacingNodeLabelMargin
      : 0
  }

  /**
   * Utilities
   */
  public readonly initializePosition = (): void => {
    this.positionInitialized = true
    this.updatePosition({ skipAnimation: true, includeXPos: true })
  }

  private getNodeWidth(): number {
    const { isRunningNode, boxCapWidth, nodeData } = this

    if (!nodeData.start) {
      return 0
    }

    const minimumWidth = isRunningNode ? boxCapWidth : boxCapWidth * 2
    const actualWidth = this.state.timeScale.dateToX(nodeData.end ?? new Date()) - this.state.timeScale.dateToX(nodeData.start)

    return actualWidth > minimumWidth ? actualWidth : minimumWidth
  }

  private getNodeHeight(): number {
    const {
      textLineHeightDefault,
      spacingNodeYPadding,
    } = this.state.styleOptions.value

    return textLineHeightDefault + spacingNodeYPadding * 2
  }

  private getBoxBodyWidth(): number {
    const { isRunningNode, nodeWidth, boxCapWidth } = this

    return isRunningNode
      ? nodeWidth - boxCapWidth
      : nodeWidth - boxCapWidth * 2
  }

  private getOutlineWidth(): number {
    const { nodeWidth, isSubNodesExpanded } = this
    const { spacingSubNodesOutlineOffset } = this.state.styleOptions.value

    if (isSubNodesExpanded) {
      return nodeWidth + spacingSubNodesOutlineOffset * 2
    }

    const minimumWidth = this.boxCapWidth * 2
    const actualCollapsedWidth = nodeWidth - spacingSubNodesOutlineOffset * 2

    return actualCollapsedWidth >= minimumWidth ? actualCollapsedWidth : minimumWidth
  }

  private getLabelText(): string {
    if (!this.hasSubNodes) {
      return this.nodeData.label
    }

    const { subNodeLabels } = this.state
    const { subflowRunId } = this.nodeData

    return subNodeLabels.value.has(subflowRunId!)
      ? subNodeLabels.value.get(subflowRunId!)!
      : this.nodeData.label
  }

  private checkIsLabelInBox(tolerance: number = 0): boolean {
    const { hasSubNodes, isSubNodesToggleFloating, subNodesToggle } = this

    return hasSubNodes && !isSubNodesToggleFloating
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
    } = this.state.styleOptions.value

    // The margin compensates for RoundedBorderRect using an inset border
    const margin = spacingNodeSelectionMargin + spacingNodeSelectionWidth

    const width = nodeWidth + margin * 2
    const height = hasSubNodes && !isSubNodesExpanded
      ? nodeHeight + spacingSubNodesOutlineBorderWidth + spacingSubNodesOutlineOffset + margin * 2
      : nodeHeight + margin * 2

    return { width, height, margin }
  }

  private emitSelection(): void {
    const { id, subflowRunId } = this.nodeData

    const nodeSelectionEvent: NodeSelectionEvent = {
      id: this.hasSubNodes ? subflowRunId! : id,
      type: this.hasSubNodes ? 'subFlowRun' : 'task',
    }

    this.emit(nodeClickEvents.nodeDetails, nodeSelectionEvent)
  }

  private readonly getSubNodesData = (): TimelineData => {
    if (!this.nodeData.subflowRunId) {
      return new Map()
    }

    const { expandedSubNodes } = this.state
    const subNodesData = expandedSubNodes.value.get(this.nodeData.subflowRunId)!.data

    return 'value' in subNodesData ? subNodesData.value : subNodesData
  }

  private getSubContentHeight(): number {
    const { spacingNodeMargin } = this.state.styleOptions.value

    if (this.subNodesContent?.height) {
      return this.subNodesContent.height
    }

    if (this.subNodesLoadingIndicator?.height) {
      return this.subNodesLoadingIndicator.height + spacingNodeMargin
    }

    if (this.noSubNodesMessage?.height) {
      return this.noSubNodesMessage.height + spacingNodeMargin
    }

    return 0
  }

  private emitSubNodesToggle(id?: string): void {
    this.emit(nodeClickEvents.subNodesToggle, id ?? this.nodeData.subflowRunId)
  }

  private destroySubNodesContent(): void {
    if (this.subNodesContentTicker) {
      this.state.pixiApp.ticker.remove(this.subNodesContentTicker)
      this.subNodesContentTicker = null
    }

    this.destroyNoSubNodesMessage()
    this.destroySubNodesLoadingIndicator()
    this.subNodesContent?.destroy()
    this.subNodesContent = null
  }

  private destroySubNodesLoadingIndicator(): void {
    this.subNodesLoadingIndicator?.destroy()
    this.subNodesLoadingIndicator = null
  }

  private destroyNoSubNodesMessage(): void {
    this.noSubNodesMessage?.destroy()
    this.noSubNodesMessage = null
  }

  private destroyRunningNodeTicker(): void {
    if (this.runningNodeTicker) {
      this.state.pixiApp.ticker.remove(this.runningNodeTicker)
      this.runningNodeTicker = null
    }
  }

  private killTweens(): void {
    gsap.killTweensOf([this, this.subNodesOutline])
  }

  public destroy(): void {
    const { cull } = this.state
    cull.remove(this.box)
    if (this.label) {
      cull.remove(this.label)
    }

    this.killTweens()

    if (this.isSelected) {
      this.emit(nodeClickEvents.nodeDetails, null)
    }

    if (this.isSubNodesExpanded) {
      this.emitSubNodesToggle()
    }

    this.destroyRunningNodeTicker()
    this.destroySubNodesContent()

    this.subNodesOutline?.destroy()
    this.leftBoxCap?.destroy()
    this.rightBoxCap?.destroy()
    this.boxBody?.destroy()
    this.box.destroy()
    this.subNodesToggle?.destroy()
    this.label?.destroy()
    this.selectedRing?.destroy()

    this.unWatchers.forEach(unwatch => unwatch())

    super.destroy.call(this)
  }
}
