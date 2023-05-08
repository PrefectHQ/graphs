import { Container, TextMetrics } from 'pixi.js'
import { watch, WatchStopHandle, ref, toRaw } from 'vue'
import {
  NodeLayoutWorkerResponse,
  NodeLayoutWorkerArgs,
  GraphState,
  NodesLayout,
  NodeLayoutRow
} from '@/models'
import {
  DeselectLayer,
  TimelineEdge,
  TimelineNode,
  destroyNodeTextureCache,
  nodeClickEvents,
  nodeResizeEvent,
  nodeAnimationDurations,
  getBitmapFonts
} from '@/pixiFunctions'
import { TimelineData, TimelineItem } from '@/types/timeline'
// eslint-disable-next-line import/default
import LayoutWorker from '@/workers/nodeLayout.worker.ts?worker&inline'

export const timelineUpdateEvent = 'timelineUpdateEvent'

type TimelineNodesProps = {
  nodeContentContainerName?: string,
  isSubNodes?: boolean,
  data: TimelineData,
  state: GraphState,
}

type EdgeRecord = {
  edge: TimelineEdge,
  sourceId: string,
  targetId: string,
}

export class TimelineNodes extends Container {
  private readonly layoutWorker: Worker = new LayoutWorker()

  private readonly isSubNodes
  private data: TimelineData
  private readonly state: GraphState

  private readonly nodeContainer = new Container()
  public readonly nodeRecords: Map<string, TimelineNode> = new Map()
  private readonly layout = ref<NodesLayout>({})
  private readonly layoutRows = ref<NodeLayoutRow[]>([])

  private readonly edgeContainer = new Container()
  private readonly edgeRecords: EdgeRecord[] = []

  private readonly unWatchers: WatchStopHandle[] = []
  private isSelectionPathHighlighted = false

  public constructor({
    nodeContentContainerName,
    isSubNodes,
    data,
    state,
  }: TimelineNodesProps) {
    super()

    if (nodeContentContainerName) {
      this.nodeContainer.name = nodeContentContainerName
    }

    this.isSubNodes = isSubNodes
    this.data = data
    this.state = state

    this.initDeselectLayer()
    this.initLayoutWorker()
    this.initWatchers()
  }

  private initWatchers(): void {
    const {
      layoutSetting,
      hideEdges,
      selectedNodeId,
    } = this.state

    this.unWatchers.push(
      watch(layoutSetting, () => {
        this.updateLayoutSetting()
      }),
      watch(hideEdges, () => {
        this.updateHideEdges()
      }),
      watch(selectedNodeId, () => {
        if (selectedNodeId.value && this.nodeRecords.has(selectedNodeId.value)) {
          if (this.isSelectionPathHighlighted) {
            this.unHighlightSelectedNodePath()
          }
          this.isSelectionPathHighlighted = true
          this.highlightSelectedNodePath()
          return
        }
        if (
          this.isSelectionPathHighlighted
          && (!selectedNodeId.value || !this.nodeRecords.has(selectedNodeId.value))
        ) {
          this.unHighlightSelectedNodePath()
        }
      }),
    )
  }

  private async initLayoutWorker(): Promise<void> {
    const {
      styleOptions,
      timeScaleArgs,
      layoutSetting,
      centerViewport,
      suppressMotion,
    } = this.state

    const textStyles = await getBitmapFonts(styleOptions.value)
    const { spacingMinimumNodeEdgeGap } = styleOptions.value

    const apxCharacterWidth = TextMetrics.measureText('M', textStyles.nodeTextStyles).width

    const layoutWorkerOptions: NodeLayoutWorkerArgs = {
      data: toRaw(this.data),
      timeScaleArgs,
      spacingMinimumNodeEdgeGap,
      apxCharacterWidth,
      layoutSetting: layoutSetting.value,
    }

    this.layoutWorker.onmessage = ({ data }: NodeLayoutWorkerResponse) => {
      this.layout.value = data.layout

      this.renderLayout()

      if (this.isSelectionPathHighlighted) {
        this.highlightSelectedNodePath()
      }

      if (data.centerViewportAfter && !this.isSubNodes) {
        // allow time for nodes to move to their new positions
        setTimeout(() => {
          centerViewport()
        }, suppressMotion.value ? 10 : nodeAnimationDurations.move * 1000 * 1.1)
      }

      this.emit(timelineUpdateEvent)
    }

    this.layoutWorker.postMessage(layoutWorkerOptions)
  }

  private initDeselectLayer(): void {
    if (this.isSubNodes) {
      return
    }

    const { pixiApp, viewport } = this.state

    const deselectLayer = new DeselectLayer(pixiApp, viewport)

    this.addChild(deselectLayer)

    deselectLayer.on('click', () => {
      this.emitNullSelection()
    })
  }

  private renderLayout(): void {
    const { layout } = this
    const isInitialRender = this.nodeRecords.size === 0
    const newlyCreatedNodes: string[] = []

    Object.keys(layout.value).forEach((nodeId) => {
      const newNodeData = this.data.get(nodeId)

      if (!newNodeData) {
        return
      }

      if (this.nodeRecords.has(nodeId)) {
        this.nodeRecords.get(nodeId)!.update(newNodeData)
      } else {
        this.createNode(newNodeData)
        newlyCreatedNodes.push(nodeId)
      }
    })

    this.updateLayoutRows()

    newlyCreatedNodes.forEach((nodeId) => {
      this.nodeRecords.get(nodeId)!.initializePosition()
    })

    if (isInitialRender) {
      this.addChild(this.edgeContainer)
      this.addChild(this.nodeContainer)

      if (!this.isSubNodes) {
        this.state.centerViewport({ skipAnimation: true })
      }
    }
  }

  private createNode(nodeData: TimelineItem): void {
    const { state: state, layout, layoutRows } = this
    const node = new TimelineNode({
      nodeData,
      state,
      layout,
      layoutRows,
    })

    this.registerEmits(node)
    this.nodeRecords.set(nodeData.id, node)
    this.addNodeEdges(nodeData)

    this.nodeContainer.addChild(node)

    node.on(nodeResizeEvent, () => {
      this.updateLayoutRows()
    })
  }

  private addNodeEdges(nodeData: TimelineItem): void {
    nodeData.upstream.forEach((upstreamDependency) => {
      const sourceNode = this.nodeRecords.get(upstreamDependency)
      const targetNode = this.nodeRecords.get(nodeData.id)

      if (!sourceNode || !targetNode) {
        console.warn('timelineNodes: could not find source or target node for edge, skipping')
        return
      }

      const edge = new TimelineEdge({
        sourceNode,
        targetNode,
        state: this.state,
      })

      if (this.state.hideEdges.value) {
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

  /**
   * Update Functions
   */
  public update(newData: TimelineData): void {
    this.data = newData

    if (newData.size !== this.nodeRecords.size) {
      const message: NodeLayoutWorkerArgs = {
        data: toRaw(this.data),
      }

      this.layoutWorker.postMessage(message)
      return
    }

    this.nodeRecords.forEach((nodeItem, nodeId) => {
      const newNodeData = this.data.get(nodeId)

      if (newNodeData) {
        nodeItem.update(newNodeData)
      }
    })

    this.emit(timelineUpdateEvent)
  }

  public updateHideEdges(): void {
    const { hideEdges, viewport } = this.state

    this.edgeRecords.forEach(({ edge }) => edge.renderable = !hideEdges.value)

    if (!hideEdges.value) {
      // the viewport needs to update transforms so the edges show in the right place
      viewport.dirty = true
      viewport.updateTransform()
    }

    if (this.isSelectionPathHighlighted) {
      this.highlightSelectedNodePath()
    }
  }

  private updateLayoutRows(position: number = 0): void {
    const { layout } = this
    const { spacingNodeMargin, spacingNodeSelectionMargin } = this.state.styleOptions.value
    const maxRows = Math.max(...Object.values(layout.value).map(node => node.row))
    let newLayoutRows: NodeLayoutRow[] = []

    const rowHeights = Object.keys(layout.value).reduce((acc, nodeId) => {
      const { row } = layout.value[nodeId]
      const currentRowHeight = acc.get(row) ?? 0
      const height = this.nodeRecords.get(nodeId)?.height ?? 0

      acc.set(row, Math.max(height, currentRowHeight))

      return acc
    }, new Map<number, number>())

    for (let i = position; i <= maxRows; i++) {
      const previousRow = newLayoutRows[i - 1] as NodeLayoutRow | undefined
      const height = rowHeights.get(i) ?? 0

      if (previousRow === undefined) {
        newLayoutRows.push({ yPos: 0, height })
        continue
      }

      const yPos = previousRow.yPos + previousRow.height - spacingNodeSelectionMargin * 2 + spacingNodeMargin

      newLayoutRows.push({ yPos, height })
    }

    if (position > 0) {
      const combinedLayoutRows = this.layoutRows.value.slice(0, position).concat(newLayoutRows)
      newLayoutRows = combinedLayoutRows
    }

    this.layoutRows.value = newLayoutRows
  }

  public updateLayoutSetting(): void {
    const { layoutSetting } = this.state

    const message: NodeLayoutWorkerArgs = {
      data: toRaw(this.data),
      layoutSetting: layoutSetting.value,
      centerViewportAfter: true,
    }

    this.layoutWorker.postMessage(message)
  }

  /**
   * Node Selection
   */
  private highlightSelectedNodePath(): void {
    const selectedNodeId = this.state.selectedNodeId.value
    const selectedNode = selectedNodeId && this.nodeRecords.get(selectedNodeId)

    if (!selectedNodeId || !selectedNode) {
      return
    }

    const { alphaNodeDimmed } = this.state.styleOptions.value

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
    const nodeData = this.data.get(nodeId)

    nodeData?.upstream.forEach((upstreamId) => {
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

    this.data.forEach((nodeData) => {
      if (nodeData.upstream.includes(nodeId)) {
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

  private unHighlightSelectedNodePath(): void {
    const { hideEdges } = this.state

    this.edgeRecords.forEach(({ edge }) => {
      if (hideEdges.value) {
        edge.renderable = false
      }
      edge.alpha = 1
    })
    this.nodeRecords.forEach((nodeRecord) => {
      nodeRecord.alpha = 1
    })
  }

  /**
   * Utilities
   */

  private registerEmits(el: TimelineNode | TimelineNodes): void {
    el.on(nodeClickEvents.nodeDetails, (nodeSelectionValue) => {
      this.emit(nodeClickEvents.nodeDetails, nodeSelectionValue)
    })
    el.on(nodeClickEvents.subNodesToggle, (id) => {
      this.emit(nodeClickEvents.subNodesToggle, id)
    })
  }

  private emitNullSelection(): void {
    this.emit(nodeClickEvents.nodeDetails, null)
  }

  public getEarliestNodeStart(): Date | null {
    let earliest: Date | null = null

    this.data.forEach(({ start }) => {
      if (start && earliest && start.getTime() < earliest.getTime()) {
        earliest = start
      }
    })

    return earliest
  }

  public destroy(): void {
    this.nodeRecords.forEach(nodeRecord => nodeRecord.destroy())
    this.nodeRecords.clear()
    this.edgeRecords.forEach(edgeRecord => edgeRecord.edge.destroy())
    this.removeChildren()
    this.unWatchers.forEach(unwatch => unwatch())
    this.layoutWorker.terminate()
    this.layoutWorker.onmessage = null

    if (!this.isSubNodes) {
      destroyNodeTextureCache()
    }

    super.destroy.call(this)
  }
}
