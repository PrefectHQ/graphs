import type { Viewport } from 'pixi-viewport'
import { Container } from 'pixi.js'
import { ComputedRef } from 'vue'
import { TimelineNode } from './timelineNode'
import { NodeRecord, NodeThemeFn, ParsedThemeStyles, TimelineNodeData, XScale } from '@/models'

type TimelineNodesProps = {
  viewportRef: Viewport,
  graphData: TimelineNodeData[],
  xScale: XScale,
  styles: ComputedRef<ParsedThemeStyles>,
  styleNode: ComputedRef<NodeThemeFn>,
}

export class TimelineNodes extends Container {
  private readonly viewportRef: Viewport
  private graphData
  private readonly xScale
  private readonly styles
  private readonly styleNode

  public readonly nodes: Map<string, NodeRecord> = new Map()
  public selectedNodeId: string | null | undefined = null

  public constructor({
    viewportRef,
    graphData,
    xScale,
    styles,
    styleNode,
  }: TimelineNodesProps) {
    super()

    this.viewportRef = viewportRef
    this.graphData = graphData
    this.xScale = xScale
    this.styles = styles
    this.styleNode = styleNode

    this.initNodes()
  }

  private initNodes(): void {
    this.graphData.forEach((nodeData, nodeIndex) => this.createNode(nodeData, nodeIndex))
  }

  private createNode(nodeData: TimelineNodeData, nodeIndex: number): void {
    const { xScale, styles, styleNode } = this

    const node = new TimelineNode({
      nodeData,
      xScale,
      styles,
      styleNode,
      yPositionIndex: nodeIndex,
    })

    this.nodes.set(nodeData.id, {
      node,
      id: nodeData.id,
      end: nodeData.end,
      state: nodeData.state,
    })

    this.addChild(node)
  }

  public update(newData?: TimelineNodeData[]): void {
    if (newData) {
      this.graphData = newData

      this.graphData.forEach((nodeData) => {
        if (this.nodes.has(nodeData.id)) {
          const node = this.nodes.get(nodeData.id)!
          node.node.update(nodeData)
        } else {
          this.createNode(nodeData, this.nodes.size)
        }
      })

      return
    }

    this.nodes.forEach(nodeItem => nodeItem.node.update())
  }

  public updateSelection(selectedNodeId?: string | null): void {
    if (!selectedNodeId && this.selectedNodeId) {
      this.nodes.get(this.selectedNodeId)?.node.deselect()
      this.selectedNodeId = null
      return
    }

    const oldSelection = this.selectedNodeId
    this.selectedNodeId = selectedNodeId

    if (oldSelection) {
      this.nodes.get(oldSelection)?.node.deselect()
    }
    if (selectedNodeId) {
      const selectedNode = this.nodes.get(selectedNodeId)!
      selectedNode.node.select()
      this.viewportRef.animate({
        position: {
          x: selectedNode.node.x + selectedNode.node.width / 2,
          y: selectedNode.node.y + selectedNode.node.height / 2,
        },
        time: 1000,
        ease: 'easeInOutQuad',
        removeOnInterrupt: true,
      })
    }
  }

  public destroy(): void {
    this.removeChildren()
    this.nodes.clear()
    super.destroy.call(this)
  }
}
