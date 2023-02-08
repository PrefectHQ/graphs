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
  NodeLayoutWorkerProps
} from '@/models'
import { getBitmapFonts } from '@/pixiFunctions/bitmapFonts'
import { DeselectLayer } from '@/pixiFunctions/deselectLayer'
import { TimelineEdge } from '@/pixiFunctions/timelineEdge'
import { TimelineNode } from '@/pixiFunctions/timelineNode'
// eslint-disable-next-line import/default
import LayoutWorker from '@/workers/nodeLayout.worker.ts?worker&inline'

type TimelineNodesProps = {
  appRef: Application,
  viewportRef: Viewport,
  graphData: TimelineNodeData[],
  styles: ComputedRef<ParsedThemeStyles>,
  styleNode: ComputedRef<NodeThemeFn>,
  layoutSetting: TimelineNodesLayoutOptions,
  hideEdges: boolean,
  timeScaleProps: InitTimelineScaleProps,
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

  private readonly nodeContainer = new Container()
  public readonly nodeRecords: Map<string, TimelineNode> = new Map()
  public selectedNodeId: string | null | undefined = null

  private layoutSetting
  private hideEdges
  private readonly layoutWorker: Worker = new LayoutWorker()
  private layout: NodesLayout = {}

  private readonly edgeContainer = new Container()
  private readonly edgeRecords: EdgeRecord[] = []

  public constructor({
    appRef,
    viewportRef,
    graphData,
    styles,
    styleNode,
    layoutSetting,
    hideEdges,
    timeScaleProps: {
      minimumStartTime,
      overallGraphWidth,
      initialOverallTimeSpan,
    },
  }: TimelineNodesProps) {
    super()

    this.appRef = appRef
    this.viewportRef = viewportRef
    this.graphData = graphData
    this.styles = styles
    this.styleNode = styleNode
    this.layoutSetting = layoutSetting
    this.hideEdges = hideEdges

    this.initDeselectLayer()

    this.initLayoutWorker({
      minimumStartTime,
      overallGraphWidth,
      initialOverallTimeSpan,
    })
  }

  private async initLayoutWorker({
    minimumStartTime,
    overallGraphWidth,
    initialOverallTimeSpan,
  }: InitTimelineScaleProps): Promise<void> {
    const textStyles = await getBitmapFonts(this.styles.value)
    const { spacingMinimumNodeEdgeGap } = this.styles.value
    const apxCharacterWidth = TextMetrics.measureText('M', textStyles.nodeTextStyles).width

    const layoutWorkerOptions: NodeLayoutWorkerProps = {
      data: {
        timeScaleProps: {
          minimumStartTime,
          overallGraphWidth,
          initialOverallTimeSpan,
        },
        spacingMinimumNodeEdgeGap,
        apxCharacterWidth,
        graphData: JSON.stringify(this.graphData),
        layoutSetting: this.layoutSetting,
      },
    }

    this.layoutWorker.onmessage = (message: NodeLayoutWorkerResponse) => {
      this.layout = message.data.layout
      this.renderLayout()
    }

    this.layoutWorker.postMessage(layoutWorkerOptions.data)
  }

  private initDeselectLayer(): void {
    const deselectLayer = new DeselectLayer(this.appRef, this.viewportRef)

    this.addChild(deselectLayer)

    deselectLayer.on('click', () => {
      this.emit('node-click', null)
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

      this.fitNodesInViewport()
    }
  }

  private async updateNodeRecordAndEdgesLayout(nodeId: string, nodeRecord: TimelineNode): Promise<void> {
    const nodeData = this.graphData.find(node => node.id === nodeId)!

    if (nodeRecord.layoutPosition === this.layout[nodeId].position) {
      nodeRecord.update(nodeData)
      return
    }

    nodeRecord.layoutPosition = this.layout[nodeId].position

    const nodeEdgeRecords: EdgeRecord[] = this.edgeRecords.filter((edgeRecord) => {
      return edgeRecord.sourceId === nodeId || edgeRecord.targetId === nodeId
    })

    nodeEdgeRecords.forEach((edgeRecord) => {
      edgeRecord.edge.visible = false
    })

    await nodeRecord.update(nodeData)

    nodeEdgeRecords.forEach((edgeRecord) => {
      edgeRecord.edge.update()
      edgeRecord.edge.visible = true
    })
  }

  private createNode(nodeData: TimelineNodeData): void {
    const { styles, styleNode } = this

    const node = new TimelineNode({
      nodeData,
      styles,
      styleNode,
      layoutPosition: this.layout[nodeData.id].position,
    })

    node.on('click', () => {
      this.emit('node-click', nodeData.id)
    })

    this.nodeRecords.set(nodeData.id, node)

    this.addNodeEdges(nodeData)

    this.nodeContainer.addChild(node)
  }

  private fitNodesInViewport(): void {
    const { spacingViewportPaddingDefault } = this.styles.value
    const { x: contentX, y: contentY, width, height } = this.nodeContainer.getBounds()

    this.viewportRef.ensureVisible(
      contentX - spacingViewportPaddingDefault,
      contentY - spacingViewportPaddingDefault,
      width + spacingViewportPaddingDefault * 2,
      height + spacingViewportPaddingDefault * 2,
      true,
    )
    this.viewportRef.moveCenter(
      contentX + width / 2,
      contentY + height / 2,
    )
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

    if (!selectedNodeId && this.selectedNodeId) {
      this.clearNodeSelection()
      return
    }

    const oldSelection = this.selectedNodeId
    if (oldSelection) {
      this.nodeRecords.get(oldSelection)?.deselect()
    }

    this.setNodeSelection(selectedNodeId ?? null)
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
      },
    }
    this.layoutWorker.postMessage(message.data)
  }

  private clearNodeSelection(): void {
    this.nodeRecords.get(this.selectedNodeId!)!.deselect()
    const oldSelectedNode = this.nodeRecords.get(this.selectedNodeId!)!
    this.centerViewportAfterOutsideAnimation(oldSelectedNode)
    this.selectedNodeId = null
  }

  private setNodeSelection(selectedNodeId: string | null): void {
    this.selectedNodeId = selectedNodeId

    if (!this.selectedNodeId) {
      return
    }

    const selectedNode = this.nodeRecords.get(this.selectedNodeId)!
    selectedNode.select()
    this.highlightSelectedNodePath(this.selectedNodeId, selectedNode)

    this.centerViewportAfterOutsideAnimation(selectedNode)
  }

  private centerViewportAfterOutsideAnimation(selectedNode: TimelineNode): void {
    setTimeout(() => {
      const xPos = selectedNode.x + selectedNode.width / 2
      const yPos = selectedNode.y + selectedNode.height / 2

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

  public destroy(): void {
    this.removeChildren()
    this.nodeRecords.forEach(nodeRecord => nodeRecord.destroy())
    this.nodeRecords.clear()
    this.edgeRecords.forEach(edgeRecord => edgeRecord.edge.destroy())
    this.layoutWorker.terminate()
    this.layoutWorker.onmessage = null
    super.destroy.call(this)
  }
}
