import { Container } from 'pixi.js'
import { ComputedRef } from 'vue'
import { TimelineNode } from './timelineNode'
import { NodeThemeFn, ParsedThemeStyles, TimelineNodeData, XScale } from '@/models'

type TimelineNodesProps = {
  graphData: TimelineNodeData[],
  xScale: XScale,
  styles: ComputedRef<ParsedThemeStyles>,
  styleNode: ComputedRef<NodeThemeFn>,
}

type NodeRecord = {
  node: TimelineNode,
  end: Date | null,
  state: string,
}

export class TimelineNodes extends Container {
  private graphData
  private readonly xScale
  private readonly styles
  private readonly styleNode

  private readonly nodes: Map<string, NodeRecord> = new Map()

  public constructor({
    graphData,
    xScale,
    styles,
    styleNode,
  }: TimelineNodesProps) {
    super()

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

  public destroy(): void {
    this.removeChildren()
    this.nodes.clear()
    super.destroy.call(this)
  }
}
