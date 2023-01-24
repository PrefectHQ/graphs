import type { Viewport } from 'pixi-viewport'
import { Application, Container, UPDATE_PRIORITY } from 'pixi.js'
import { ComputedRef } from 'vue'
import { getBitmapFonts } from './bitmapFonts'
import { DeselectLayer } from './deselectLayer'
import { TimelineNode } from './timelineNode'
import {
  NodeLayoutWorkerResponse,
  NodeThemeFn,
  ParsedThemeStyles,
  TimelineNodeData,
  TimelineNodesLayoutOptions,
  NodesLayout,
  InitTimelineScaleProps
} from '@/models'
// eslint-disable-next-line import/default
import LayoutWorker from '@/workers/nodeLayout.worker.ts?worker&inline'

type TimelineNodesProps = {
  appRef: Application,
  viewportRef: Viewport,
  graphData: TimelineNodeData[],
  styles: ComputedRef<ParsedThemeStyles>,
  styleNode: ComputedRef<NodeThemeFn>,
  timeScaleProps: InitTimelineScaleProps,
}

export type NodeRecord = {
  node: TimelineNode,
  data: TimelineNodeData,
}
export class TimelineNodes extends Container {
  private readonly appRef: Application
  private readonly viewportRef: Viewport
  private graphData
  private readonly styles
  private readonly styleNode

  private readonly contentContainer = new Container()
  public readonly nodeRecords: Map<string, NodeRecord> = new Map()
  public selectedNodeId: string | null | undefined = null

  private readonly layoutSetting: TimelineNodesLayoutOptions
  private readonly layoutWorker: Worker = new LayoutWorker()
  private layout: NodesLayout = {}

  public constructor({
    appRef,
    viewportRef,
    graphData,
    styles,
    styleNode,
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
    this.layoutSetting = 'nearestParent'

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

    this.layoutWorker.onmessage = (message: NodeLayoutWorkerResponse) => {
      this.layout = message.data
      this.renderLayout()
    }

    this.layoutWorker.postMessage({
      timeScaleProps: {
        minimumStartTime,
        overallGraphWidth,
        initialOverallTimeSpan,
      },
      defaultTextStyles: textStyles.nodeTextStyles,
      graphData: JSON.stringify(this.graphData),
      layoutSetting: this.layoutSetting,
    })
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
        nodeRecord.node.layoutPosition = this.layout[nodeId].position
        nodeRecord.node.update()
      } else {
        this.createNode(this.graphData.find(node => node.id === nodeId)!)
      }
    })

    if (isInitialRender) {
      this.addChild(this.contentContainer)
      this.fitNodesInViewport()
    }
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

    this.nodeRecords.set(nodeData.id, {
      node,
      data: nodeData,
    })

    this.contentContainer.addChild(node)
  }

  private fitNodesInViewport(): void {
    const { spacingViewportPaddingDefault } = this.styles.value
    const { x: contentX, y: contentY, width, height } = this.contentContainer.getBounds()

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

  public update(newData?: TimelineNodeData[]): void {
    if (newData && newData === this.graphData) {
      return
    }

    if (newData) {
      this.graphData = newData
      this.layoutWorker.postMessage({
        graphData: JSON.stringify(this.graphData),
      })
      return
    }

    this.nodeRecords.forEach(nodeItem => nodeItem.node.update())
  }

  public updateSelection(selectedNodeId?: string | null): void {
    if (!selectedNodeId && this.selectedNodeId) {
      this.nodeRecords.get(this.selectedNodeId)?.node.deselect()
      this.selectedNodeId = null
      return
    }

    const oldSelection = this.selectedNodeId
    this.selectedNodeId = selectedNodeId

    if (oldSelection) {
      this.nodeRecords.get(oldSelection)?.node.deselect()
    }
    if (selectedNodeId) {
      const selectedNode = this.nodeRecords.get(selectedNodeId)!
      selectedNode.node.select()

      // Wait for the outside animation to initialize
      setTimeout(() => {
        this.viewportRef.animate({
          position: {
            x: selectedNode.node.x + selectedNode.node.width / 2,
            y: selectedNode.node.y + selectedNode.node.height / 2,
          },
          time: 1000,
          ease: 'easeInOutQuad',
          removeOnInterrupt: true,
        })
      }, 100)
    }
  }

  public destroy(): void {
    this.removeChildren()
    this.nodeRecords.clear()
    this.layoutWorker.terminate()
    this.layoutWorker.onmessage = null
    super.destroy.call(this)
  }
}
