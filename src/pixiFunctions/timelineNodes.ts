import type { Viewport } from 'pixi-viewport'
import { Application, Container, UPDATE_PRIORITY } from 'pixi.js'
import { ComputedRef } from 'vue'
import { DeselectLayer } from './deselectLayer'
import { TimelineNode } from './timelineNode'
import { NodeThemeFn, ParsedThemeStyles, TimelineNodeData, XScale } from '@/models'
import { mapSome } from '@/utilities'

const minimumNodeGap = 16

type TimelineNodesProps = {
  appRef: Application,
  viewportRef: Viewport,
  graphData: TimelineNodeData[],
  xScale: XScale,
  styles: ComputedRef<ParsedThemeStyles>,
  styleNode: ComputedRef<NodeThemeFn>,
}

type TimelineNodesLayout = 'waterfall' | 'nearestParent'

export type NodeRecordShoveDirections = 'up' | 'down'
export type NodeRecord = {
  node: TimelineNode,
  data: TimelineNodeData,
  position: number,
  nextDependencyShove?: NodeRecordShoveDirections,
}

type IsNodesOverlappingProps = {
  firstNodeEndX: number,
  firstNodePosition: number,
  lastNodeStartX: number,
  lastNodePosition: number,
}

type ShoveProps = {
  direction: NodeRecordShoveDirections,
  nodeStartX: number,
  desiredPosition: number,
}

export class TimelineNodes extends Container {
  private readonly appRef: Application
  private readonly viewportRef: Viewport
  private graphData
  private readonly xScale
  private readonly styles
  private readonly styleNode

  public readonly nodeRecords: Map<string, NodeRecord> = new Map()
  private readonly layout: TimelineNodesLayout
  public selectedNodeId: string | null | undefined = null

  public constructor({
    appRef,
    viewportRef,
    graphData,
    xScale,
    styles,
    styleNode,
  }: TimelineNodesProps) {
    super()

    this.appRef = appRef
    this.viewportRef = viewportRef
    this.graphData = graphData
    this.xScale = xScale
    this.styles = styles
    this.styleNode = styleNode

    this.initDeselectLayer()

    this.layout = 'nearestParent'
    this.initNodes()
  }

  private initDeselectLayer(): void {
    const deselectLayer = new DeselectLayer(this.appRef, this.viewportRef)

    this.addChild(deselectLayer)

    deselectLayer.on('click', () => {
      this.emit('node-click', null)
    })
  }

  private initNodes(): void {
    this.graphData.forEach((nodeData, nodeIndex) => this.createNode(nodeData, nodeIndex))
  }

  private createNode(nodeData: TimelineNodeData, nodeIndex: number): void {
    const { xScale, styles, styleNode } = this
    const position = this.getNodeYPosition(nodeData, nodeIndex)

    const node = new TimelineNode({
      nodeData,
      xScale,
      styles,
      styleNode,
      yPositionIndex: position,
    })

    node.on('click', () => {
      this.emit('node-click', nodeData.id)
    })

    this.nodeRecords.set(nodeData.id, {
      node,
      data: nodeData,
      position,
    })

    this.addChild(node)
  }

  private getNodeYPosition(nodeData: TimelineNodeData, nodeIndex: number): number {
    if (this.layout === 'nearestParent') {
      return this.getNearestParentPositioning(nodeData)
    }

    return nodeIndex
  }

  private getNearestParentPositioning(nodeData: TimelineNodeData): number {
    const defaultPosition = 0
    const nodeStartX = this.xScale(nodeData.start)

    // if one dependency
    if (nodeData.upstreamDependencies && nodeData.upstreamDependencies.length === 1) {
      const parentRecord = this.nodeRecords.get(nodeData.upstreamDependencies[0])

      if (!parentRecord) {
        console.warn('timelineNodes: Parent node not found on graph', nodeData.upstreamDependencies[0])
        return defaultPosition
      }

      // eslint-disable-next-line prefer-destructuring
      return this.placeNearUpstreamNode(parentRecord, nodeData, nodeStartX)
    }

    // if more than one dependency – add to the middle of upstream dependencies
    if (nodeData.upstreamDependencies && nodeData.upstreamDependencies.length > 0) {
      const upstreamNodeRecords = nodeData.upstreamDependencies
        .map(id => this.nodeRecords.get(id))
        .filter((nodeRecordItem): nodeRecordItem is NodeRecord => !!nodeRecordItem)
      const upstreamPositions = upstreamNodeRecords.map(node => node.position)
      const upstreamPositionSum = upstreamPositions.reduce((sum, position) => sum + position, 0)
      const upstreamPositionAverage = upstreamPositionSum / upstreamPositions.length

      const position = Math.round(upstreamPositionAverage)

      if (this.isPositionTaken(nodeStartX, position)) {
        const nodeRecordsTakingPosition = this.getOverlappingNodes(
          nodeStartX,
          position,
        )!

        const upstreamDependenciesTakingPosition = nodeRecordsTakingPosition.filter(nodeRecord => {
          return nodeData.upstreamDependencies?.includes(nodeRecord.data.id)
        })

        if (upstreamDependenciesTakingPosition.length > 0 || nodeRecordsTakingPosition.length > 1) {
          // upstream nodeData dependencies always win, or if there are more than one node in the way
          const [upstreamNode] = upstreamDependenciesTakingPosition.length > 0
            ? upstreamDependenciesTakingPosition
            : nodeRecordsTakingPosition

          upstreamNode.nextDependencyShove = this.getShoveDirectionWeightedByDependencies(
            upstreamPositions,
            position,
            upstreamNode.nextDependencyShove,
          )

          return this.placeNearUpstreamNode(upstreamNode, nodeData, nodeStartX)
        }

        // Argue
        const [competingNodeRecord] = nodeRecordsTakingPosition

        const [
          competingNodeRecordUpwardConnections,
          competingNodeRecordDownwardConnections,
        ] = competingNodeRecord.data.upstreamDependencies?.reduce((counts, id) => {
          const nodeRecord = this.nodeRecords.get(id)

          if (!nodeRecord) {
            console.warn('timelineNodes: Parent node not found on graph', id)
            return counts
          }

          if (nodeRecord.position < competingNodeRecord.position) {
            counts[0] += 1
          }

          if (nodeRecord.position > competingNodeRecord.position) {
            counts[1] += 1
          }

          return counts
        }, [0, 0]) ?? [0, 0]

        const nodeDataUpwardConnections = upstreamPositions.filter((upstreamPosition) => upstreamPosition < position).length
        const nodeDataDownwardConnections = upstreamPositions.filter((upstreamPosition) => upstreamPosition > position).length

        if (nodeDataUpwardConnections > nodeDataDownwardConnections) {
          // nodeData has more upstream dependencies above it
          if (
            competingNodeRecordUpwardConnections > competingNodeRecordDownwardConnections
            && competingNodeRecordUpwardConnections > nodeDataUpwardConnections
          ) {
            // competing node also has more upstream dependencies above it than below and
            // competing node has more upstream dependencies above it than nodeData, so take place and shove competing up
            this.shove({
              direction: 'up',
              nodeStartX,
              desiredPosition: position,
            })
            return position
          }
          if (competingNodeRecordDownwardConnections > competingNodeRecordUpwardConnections) {
            // competing node has more upstream dependencies below it than above, so take place and shove competing down
            this.shove({
              direction: 'down',
              nodeStartX,
              desiredPosition: position,
            })
            return position
          }

          competingNodeRecord.nextDependencyShove = 'up'
          return this.placeNearUpstreamNode(competingNodeRecord, nodeData, nodeStartX)
        }

        if (nodeDataDownwardConnections > nodeDataUpwardConnections) {
          // nodeData has more upstream dependencies below it
          if (
            competingNodeRecordDownwardConnections > competingNodeRecordUpwardConnections
            && competingNodeRecordDownwardConnections > nodeDataDownwardConnections
          ) {
            // competing node also has more upstream dependencies below it than above and
            // competing node has more upstream dependencies below it than nodeData, so take place and shove competing down
            this.shove({
              direction: 'down',
              nodeStartX,
              desiredPosition: position,
            })
            return position
          }
          if (competingNodeRecordUpwardConnections > competingNodeRecordDownwardConnections) {
            // competing node has more upstream dependencies above it than below, so take place and shove competing up
            this.shove({
              direction: 'up',
              nodeStartX,
              desiredPosition: position,
            })
            return position
          }

          competingNodeRecord.nextDependencyShove = 'up'
          return this.placeNearUpstreamNode(competingNodeRecord, nodeData, nodeStartX)
        }

        return this.placeNearUpstreamNode(competingNodeRecord, nodeData, nodeStartX)
      }
    }

    // if zero dependencies, add at default position or below if taken
    return this.placeRootNode(nodeStartX, defaultPosition)
  }

  private placeRootNode(nodeStartX: number, defaultPosition: number): number {
    if (this.isPositionTaken(nodeStartX, defaultPosition)) {
      return this.placeRootNode(nodeStartX, defaultPosition + 1)
    }

    return defaultPosition
  }

  private placeNearUpstreamNode(upstreamNode: NodeRecord, nodeData: TimelineNodeData, nodeStartX: number): number {
    const upstreamNodePosition = upstreamNode.position

    if (!upstreamNode.nextDependencyShove) {
      upstreamNode.nextDependencyShove = 'down'
    }

    if (this.isPositionTaken(nodeStartX, upstreamNodePosition)) {
      if (upstreamNode.nextDependencyShove === 'down') {
        if (!this.isPositionTaken(nodeStartX, upstreamNodePosition + 1)) {
          upstreamNode.nextDependencyShove = 'up'
          return upstreamNodePosition + 1
        } else if (!this.isPositionTaken(nodeStartX, upstreamNodePosition - 1)) {
          upstreamNode.nextDependencyShove = 'down'
          return upstreamNodePosition - 1
        }

        this.shove({
          direction: 'down',
          nodeStartX,
          desiredPosition: upstreamNodePosition,
        })
        return upstreamNodePosition + 1
      }
      if (!this.isPositionTaken(nodeStartX, upstreamNodePosition - 1)) {
        upstreamNode.nextDependencyShove = 'down'
        return upstreamNodePosition - 1
      } else if (!this.isPositionTaken(nodeStartX, upstreamNodePosition + 1)) {
        upstreamNode.nextDependencyShove = 'up'
        return upstreamNodePosition + 1
      }

      this.shove({
        direction: 'up',
        nodeStartX,
        desiredPosition: upstreamNodePosition - 1,
      })
      return upstreamNodePosition - 1
    }

    return upstreamNodePosition
  }

  private shove({ direction, nodeStartX, desiredPosition }: ShoveProps): void {
    // find all nodes that are touching the bounds
    const nodeRecordsTakingPosition = this.getOverlappingNodes(nodeStartX, desiredPosition)

    if (!nodeRecordsTakingPosition) {
      return
    }

    // push nodes and recursively shove as needed
    nodeRecordsTakingPosition.forEach((nodeRecord) => {
      nodeRecord.position = direction === 'down' ? desiredPosition + 1 : desiredPosition - 1
      nodeRecord.node.updatePosition()
      this.shove({
        direction,
        nodeStartX: nodeRecord.node.x,
        desiredPosition: nodeRecord.position,
      })
    })
  }

  private isNodesOverlapping({
    firstNodeEndX,
    firstNodePosition,
    lastNodeStartX,
    lastNodePosition,
  }: IsNodesOverlappingProps): boolean {
    return firstNodePosition === lastNodePosition
      && firstNodeEndX + minimumNodeGap >= lastNodeStartX
  }

  private getOverlappingNodes(nodeStartX: number, position: number): NodeRecord[] | undefined {
    const nodeRecordsTakingPosition: NodeRecord[] = []
    this.nodeRecords.forEach((nodeRecord) => {
      const isNodeRecordTouching = this.isNodesOverlapping({
        firstNodeEndX: nodeRecord.node.x + nodeRecord.node.width,
        firstNodePosition: nodeRecord.position,
        lastNodeStartX: nodeStartX,
        lastNodePosition: position,
      })

      if (nodeRecord.position === position && isNodeRecordTouching) {
        nodeRecordsTakingPosition.push(nodeRecord)
      }
    })

    if (nodeRecordsTakingPosition.length === 0) {
      return
    }

    // sort in reverse chronological end date
    nodeRecordsTakingPosition.sort((recordA, recordB) => {
      const endDateA = recordA.data.end ?? new Date()
      const endDateB = recordB.data.end ?? new Date()
      if (endDateA < endDateB) {
        return 1
      }
      if (endDateA > endDateB) {
        return -1
      }
      return 0
    })

    return nodeRecordsTakingPosition
  }

  private getShoveDirectionWeightedByDependencies(
    upstreamPositions: number[],
    position: number,
    defaultGravity?: NodeRecordShoveDirections,
  ): NodeRecordShoveDirections {
    // check if nodeData has more connections above or below, prefer placement in that direction
    const nodeDataUpwardConnections = upstreamPositions.filter((upstreamPosition) => upstreamPosition < position).length
    const nodeDataDownwardConnections = upstreamPositions.filter((upstreamPosition) => upstreamPosition > position).length

    if (nodeDataUpwardConnections > nodeDataDownwardConnections) {
      return 'up'
    }

    return defaultGravity ?? 'down'
  }

  private isPositionTaken(nodeStartX: number, position: number): boolean {
    return mapSome(this.nodeRecords, (nodeRecord) => {
      return this.isNodesOverlapping({
        firstNodeEndX: nodeRecord.node.x + nodeRecord.node.width,
        firstNodePosition: nodeRecord.position,
        lastNodeStartX: nodeStartX,
        lastNodePosition: position,
      })
    })
  }

  public update(newData?: TimelineNodeData[]): void {
    if (newData) {
      this.graphData = newData

      this.graphData.forEach((nodeData) => {
        if (this.nodeRecords.has(nodeData.id)) {
          const node = this.nodeRecords.get(nodeData.id)!
          node.node.update(nodeData)
        } else {
          this.createNode(nodeData, this.nodeRecords.size)
        }
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
    super.destroy.call(this)
  }
}
