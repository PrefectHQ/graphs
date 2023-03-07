import gsap from 'gsap'
import type { Viewport } from 'pixi-viewport'
import { Application, Container, TextMetrics } from 'pixi.js'
import { ComputedRef } from 'vue'
import {
  NodeLayoutWorkerResponse,
  NodeThemeFn,
  ParsedThemeStyles,
  TimelineNodeData,
  TimelineNodesLayoutOptions,
  NodesLayout,
  InitTimelineScaleProps,
  NodeLayoutWorkerProps,
  CenterViewportOptions,
  ExpandedSubNodes
} from '@/models'
import {
  getBitmapFonts,
  DeselectLayer,
  TimelineEdge,
  TimelineNode,
  timelineScale,
  destroyNodeTextureCache,
  nodeAnimationDurations,
  nodeClickEvents
} from '@/pixiFunctions'
// eslint-disable-next-line import/default
import LayoutWorker from '@/workers/nodeLayout.worker.ts?worker&inline'

type TimelineNodesProps = {
  nodeContentContainerName?: string,
  appRef: Application,
  viewportRef: Viewport,
  graphData: TimelineNodeData[],
  styles: ComputedRef<ParsedThemeStyles>,
  styleNode: ComputedRef<NodeThemeFn>,
  layoutSetting: TimelineNodesLayoutOptions,
  hideEdges: boolean,
  expandedSubNodes?: ExpandedSubNodes,
  isSubNodes?: boolean,
  timeScaleProps: InitTimelineScaleProps,
  centerViewport?: (options?: CenterViewportOptions) => void,
}

type EdgeRecord = {
  edge: TimelineEdge,
  sourceId: string,
  targetId: string,
}

export class TimelineNodes extends Container {
  private readonly appRef: Application
  private readonly viewportRef: Viewport
  private graphData
  private readonly styles
  private readonly styleNode
  private readonly timeScaleProps: InitTimelineScaleProps
  private readonly centerViewport

  private readonly nodeContainer = new Container()
  public readonly nodeRecords: Map<string, TimelineNode> = new Map()
  public selectedNodeId: string | null | undefined = null

  private layoutSetting
  private hideEdges
  private readonly layoutWorker: Worker = new LayoutWorker()
  private layout: NodesLayout = {}

  private readonly isSubNodes
  private readonly expandedSubNodes
  private subNodesRecords: Map<string, TimelineNodes> | undefined

  private readonly edgeContainer = new Container()
  private readonly edgeRecords: EdgeRecord[] = []

  public constructor({
    nodeContentContainerName,
    appRef,
    viewportRef,
    graphData,
    styles,
    styleNode,
    layoutSetting,
    hideEdges,
    expandedSubNodes,
    isSubNodes,
    timeScaleProps,
    centerViewport,
  }: TimelineNodesProps) {
    super()

    this.appRef = appRef
    this.viewportRef = viewportRef
    this.graphData = graphData
    this.styles = styles
    this.styleNode = styleNode
    this.timeScaleProps = timeScaleProps
    this.centerViewport = centerViewport
    this.layoutSetting = layoutSetting
    this.hideEdges = hideEdges
    this.isSubNodes = isSubNodes
    this.expandedSubNodes = expandedSubNodes

    this.initDeselectLayer()

    if (nodeContentContainerName) {
      this.nodeContainer.name = nodeContentContainerName
    }

    this.initLayoutWorker()
  }

  private async initLayoutWorker(): Promise<void> {
    const textStyles = await getBitmapFonts(this.styles.value)
    const { spacingMinimumNodeEdgeGap } = this.styles.value
    const apxCharacterWidth = TextMetrics.measureText('M', textStyles.nodeTextStyles).width

    const layoutWorkerOptions: NodeLayoutWorkerProps = {
      data: {
        timeScaleProps: this.timeScaleProps,
        spacingMinimumNodeEdgeGap,
        apxCharacterWidth,
        graphData: JSON.stringify(this.graphData),
        layoutSetting: this.layoutSetting,
      },
    }

    this.layoutWorker.onmessage = ({ data }: NodeLayoutWorkerResponse) => {
      this.layout = data.layout

      this.renderLayout()

      if (data.centerViewportAfter) {
        this.centerViewportAfterDelay()
      }
    }

    this.layoutWorker.postMessage(layoutWorkerOptions.data)
  }

  private centerViewportAfterDelay(): void {
    if (this.isSubNodes || !this.centerViewport) {
      return
    }

    // allow time for nodes to move to new position
    setTimeout(() => {
      this.centerViewport!()
    }, nodeAnimationDurations.move * 1000)
  }

  private initDeselectLayer(): void {
    if (this.isSubNodes) {
      return
    }

    const deselectLayer = new DeselectLayer(this.appRef, this.viewportRef)

    this.addChild(deselectLayer)

    deselectLayer.on('click', () => {
      this.emitNullSelection()
    })
  }

  private renderLayout(): void {
    const isInitialRender = this.nodeRecords.size === 0

    Object.keys(this.layout).forEach((nodeId) => {
      if (this.nodeRecords.has(nodeId)) {
        const nodeRecord = this.nodeRecords.get(nodeId)!
        this.updateNodeRecordAndEdgesLayout(nodeId, nodeRecord)
      } else {
        this.createNode(this.graphData.find(node => node.id === nodeId)!)
      }
    })

    if (isInitialRender) {
      this.addChild(this.edgeContainer)
      this.addChild(this.nodeContainer)

      if (!this.isSubNodes && this.centerViewport) {
        this.centerViewport({ skipAnimation: true })
      }
    }
  }

  private async updateNodeRecordAndEdgesLayout(nodeId: string, nodeRecord: TimelineNode): Promise<void> {
    const layoutPosition = this.layout[nodeId].position

    nodeRecord.update(true)

    if (nodeRecord.position.y !== this.getNodeYPosition(layoutPosition)) {
      const nodeEdgeRecords: EdgeRecord[] = this.edgeRecords.filter((edgeRecord) => {
        return edgeRecord.sourceId === nodeId || edgeRecord.targetId === nodeId
      })
      nodeEdgeRecords.forEach((edgeRecord) => {
        edgeRecord.edge.visible = false
      })

      // !!!! @TODO: If the pairing node hasn't updated yet, this could lead to incorrect targets and
      // will lead to double updates.
      await this.updateNodePosition(nodeRecord, true)

      nodeEdgeRecords.forEach((edgeRecord) => {
        edgeRecord.edge.update()
        edgeRecord.edge.visible = true
      })
    }
  }

  private createNode(nodeData: TimelineNodeData): void {
    const { appRef, styles, styleNode } = this

    const node = new TimelineNode({
      appRef,
      nodeData,
      styles,
      styleNode,
    })

    this.registerEmits(node)

    this.nodeRecords.set(nodeData.id, node)

    this.updateNodePosition(node)

    this.addNodeEdges(nodeData)

    this.nodeContainer.addChild(node)
  }

  private registerEmits(el: TimelineNode | TimelineNodes): void {
    el.on(nodeClickEvents.nodeDetails, (id) => {
      this.emit(nodeClickEvents.nodeDetails, id)
    })
    el.on(nodeClickEvents.subNodesToggle, (id) => {
      this.emit(nodeClickEvents.subNodesToggle, id)
    })
  }

  private readonly getNodeYPosition = (layoutPosition: number): number => {
    const { spacingNodeMargin, textLineHeightDefault, spacingNodeYPadding } = this.styles.value
    const nodeHeight = textLineHeightDefault + spacingNodeYPadding * 2
    const layoutPositionOffset = nodeHeight + spacingNodeMargin

    return layoutPosition * layoutPositionOffset
  }

  private async updateNodePosition(node: TimelineNode, animate?: boolean): Promise<void> {
    const layoutPosition = this.layout[node.nodeData.id].position
    const xPos = timelineScale.dateToX(node.nodeData.start)
    const yPos = this.getNodeYPosition(layoutPosition)

    if (!animate) {
      node.position.set(xPos, yPos)
      return
    }

    await new Promise((resolve) => {
      gsap.to(node, {
        x: xPos,
        y: yPos,
        duration: nodeAnimationDurations.move,
        ease: 'power1.out',
      }).then(() => {
        resolve(null)
      })
    })
  }

  private addNodeEdges(nodeData: TimelineNodeData): void {
    if (!nodeData.upstreamDependencies) {
      return
    }

    nodeData.upstreamDependencies.forEach((upstreamDependency) => {
      const sourceNode = this.nodeRecords.get(upstreamDependency)
      const targetNode = this.nodeRecords.get(nodeData.id)

      if (!sourceNode || !targetNode) {
        console.warn('timelineNodes: could not find source or target node for edge, skipping')
        return
      }

      const edge = new TimelineEdge({
        appRef: this.appRef,
        styles: this.styles,
        sourceNode,
        targetNode,
      })

      if (this.hideEdges) {
        edge.renderable = false
      }

      this.edgeRecords.push({
        edge,
        sourceId: upstreamDependency,
        targetId: nodeData.id,
      })

      this.edgeContainer.addChild(edge)
    })
  }

  public update(newData?: TimelineNodeData[]): void {
    if (newData) {
      this.graphData = newData
      const message: NodeLayoutWorkerProps = {
        data: {
          graphData: JSON.stringify(this.graphData),
        },
      }
      this.layoutWorker.postMessage(message.data)
      return
    }

    this.nodeRecords.forEach(nodeItem => nodeItem.update())
  }

  public updateSelection(selectedNodeId?: string | null): void {
    this.unHighlightAll()
    this.clearNodeSelection()
    this.setNodeSelection(selectedNodeId ?? null)
  }

  private unHighlightAll(): void {
    this.edgeRecords.forEach(({ edge }) => {
      if (this.hideEdges) {
        edge.renderable = false
      }
      edge.alpha = 1
    })
    this.nodeRecords.forEach((nodeRecord) => {
      nodeRecord.alpha = 1
    })
    this.subNodesRecords?.forEach((subNodes) => {
      subNodes.unHighlightAll()
    })
  }

  private clearNodeSelection(): void {
    if (!this.selectedNodeId) {
      return
    }

    let oldSelectedNode = this.nodeRecords.get(this.selectedNodeId)

    if (!oldSelectedNode) {
      this.subNodesRecords?.forEach((subFlow) => {
        if (subFlow.nodeRecords.has(this.selectedNodeId!)) {
          oldSelectedNode = subFlow.nodeRecords.get(this.selectedNodeId!)!
        }
      })
    }

    if (oldSelectedNode) {
      oldSelectedNode.deselect()
      this.centerViewportToNodeAfterDelay(oldSelectedNode)
    }

    this.selectedNodeId = null
  }

  private setNodeSelection(selectedNodeId: string | null): void {
    if (!selectedNodeId) {
      return
    }

    this.selectedNodeId = selectedNodeId

    if (this.nodeRecords.has(selectedNodeId)) {
      const selectedNode = this.nodeRecords.get(selectedNodeId)!

      selectedNode.select()
      this.highlightSelectedNodePath(this.selectedNodeId, selectedNode)

      this.centerViewportToNodeAfterDelay(selectedNode)
      return
    }

    this.subNodesRecords?.forEach((subNodes) => {
      if (subNodes.nodeRecords.has(selectedNodeId)) {
        subNodes.setNodeSelection(selectedNodeId)
      }
    })
  }

  private centerViewportToNodeAfterDelay(selectedNode: TimelineNode): void {
    setTimeout(() => {
      const xPos = (selectedNode.worldTransform.tx - this.viewportRef.x) / this.viewportRef.scale.x + selectedNode.width / 2
      const yPos = (selectedNode.worldTransform.ty - this.viewportRef.y) / this.viewportRef.scale.y + selectedNode.height / 2

      this.viewportRef.animate({
        position: {
          x: xPos,
          y: yPos,
        },
        time: 1000,
        ease: 'easeInOutQuad',
        removeOnInterrupt: true,
      })
    }, 100)
  }

  private highlightSelectedNodePath(selectedNodeId: string, selectedNode: TimelineNode): void {
    const { alphaNodeDimmed } = this.styles.value
    const highlightedEdges = [
      ...this.getAllUpstreamEdges(selectedNodeId),
      ...this.getAllDownstreamEdges(selectedNodeId),
    ]
    const highlightedNodes: Map<string, TimelineNode> = new Map()
    highlightedNodes.set(selectedNodeId, selectedNode)

    this.edgeRecords.forEach((edgeRecord) => {
      if (highlightedEdges.includes(edgeRecord)) {
        const upstreamNode = this.nodeRecords.get(edgeRecord.sourceId)!
        const downstreamNode = this.nodeRecords.get(edgeRecord.targetId)!
        highlightedNodes.set(edgeRecord.sourceId, upstreamNode)
        highlightedNodes.set(edgeRecord.targetId, downstreamNode)
        edgeRecord.edge.renderable = true
        return
      }
      edgeRecord.edge.alpha = alphaNodeDimmed
    })
    this.nodeRecords.forEach((nodeRecord, nodeRecordId) => {
      if (highlightedNodes.has(nodeRecordId)) {
        return
      }
      nodeRecord.alpha = alphaNodeDimmed
    })
  }

  private getAllUpstreamEdges(nodeId: string): EdgeRecord[] {
    const connectedEdges: EdgeRecord[] = []

    const nodeData = this.graphData.find(node => node.id === nodeId)
    nodeData?.upstreamDependencies?.forEach((upstreamId) => {
      const edge = this.edgeRecords.find(edgeRecord => {
        return edgeRecord.sourceId === upstreamId && edgeRecord.targetId === nodeId
      })
      if (edge) {
        connectedEdges.push(edge)
        const upstreamEdges = this.getAllUpstreamEdges(upstreamId)
        connectedEdges.push(...upstreamEdges)
      }
    })

    return connectedEdges
  }

  private getAllDownstreamEdges(nodeId: string): EdgeRecord[] {
    const connectedEdges: EdgeRecord[] = []

    this.graphData.forEach((nodeData) => {
      if (nodeData.upstreamDependencies?.includes(nodeId)) {
        const edge = this.edgeRecords.find(edgeRecord => {
          return edgeRecord.targetId === nodeData.id && edgeRecord.sourceId === nodeId
        })
        if (edge) {
          connectedEdges.push(edge)
          const downstreamEdges = this.getAllDownstreamEdges(nodeData.id)
          connectedEdges.push(...downstreamEdges)
        }
      }
    })

    return connectedEdges
  }

  public updateHideEdges(hideEdges: boolean): void {
    this.hideEdges = hideEdges

    this.edgeRecords.forEach(({ edge }) => edge.renderable = !this.hideEdges)

    if (!this.hideEdges) {
      // the viewport needs to update transforms so the edges show in the right place
      this.viewportRef.dirty = true
      this.viewportRef.updateTransform()
      return
    }

    if (this.selectedNodeId) {
      const selectedNode = this.nodeRecords.get(this.selectedNodeId)!
      this.highlightSelectedNodePath(this.selectedNodeId, selectedNode)
    }
  }

  public updateLayoutSetting(layoutSetting: TimelineNodesLayoutOptions): void {
    this.layoutSetting = layoutSetting
    const message: NodeLayoutWorkerProps = {
      data: {
        graphData: JSON.stringify(this.graphData),
        layoutSetting,
        centerViewportAfter: true,
      },
    }
    this.layoutWorker.postMessage(message.data)
  }

  public updateExpandedSubNodes(): void {
    if (!this.subNodesRecords) {
      this.subNodesRecords = new Map()
    }

    this.expandedSubNodes?.forEach((subNodesData, nodeId) => {
      // handle loading

      if (this.subNodesRecords!.has(nodeId)) {
        const subNodes = this.subNodesRecords!.get(nodeId)!
        subNodes.update(subNodesData)
        return
      }

      const subNodes = new TimelineNodes({
        isSubNodes: true,
        appRef: this.appRef,
        viewportRef: this.viewportRef,
        graphData: subNodesData,
        styles: this.styles,
        styleNode: this.styleNode,
        layoutSetting: this.layoutSetting,
        hideEdges: this.hideEdges,
        timeScaleProps: this.timeScaleProps,
        centerViewport: this.centerViewport,
      })
      subNodes.position.set(subNodes.position.x, this.nodeContainer.height)

      this.subNodesRecords!.set(nodeId, subNodes)
      this.registerEmits(subNodes)

      // Allow node to render in it's own container
      this.viewportRef.addChild(subNodes)
    })

    this.subNodesRecords.forEach((subNodes, nodeId) => {
      if (!this.expandedSubNodes?.has(nodeId)) {
        if (this.selectedNodeId && subNodes.nodeRecords.has(this.selectedNodeId)) {
          this.emitNullSelection()
        }
        subNodes.destroy()
        this.subNodesRecords!.delete(nodeId)
      }
    })

    // check layout
  }

  private emitNullSelection(): void {
    this.emit(nodeClickEvents.nodeDetails, null)
  }

  public destroy(): void {
    this.removeChildren()
    this.nodeRecords.forEach(nodeRecord => nodeRecord.destroy())
    this.nodeRecords.clear()
    this.edgeRecords.forEach(edgeRecord => edgeRecord.edge.destroy())
    this.layoutWorker.terminate()
    this.layoutWorker.onmessage = null
    this.subNodesRecords?.forEach(subNodes => subNodes.destroy())
    this.subNodesRecords?.clear()

    if (!this.isSubNodes) {
      destroyNodeTextureCache()
    }

    super.destroy.call(this)
  }
}
