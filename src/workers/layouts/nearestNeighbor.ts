import { NodeLayoutItem, NodeShoveDirection, NodesLayout, TimeScale } from '@/models'
import { TimelineData, TimelineItem } from '@/types/timeline'

const DEFAULT_POSITION = 0

type FactoryArgs = {
  data: TimelineData,
  timeScale: TimeScale,
  currentApxCharacterWidth: number,
  minimumNodeEdgeGap: number,
}

type ShoveProps = {
  direction: NodeShoveDirection,
  nodeStartX: number,
  desiredPosition: number,
}

type IsNodesOverlappingProps = {
  firstNodeEndX: number,
  firstNodePosition: number,
  lastNodeStartX: number,
  lastNodePosition: number,
}

type ArgueWithCompetingUpstreamPlacementProps = {
  desiredPosition: number,
  nodeStartX: number,
  upstreamPositions: number[],
  competingLayoutItemId: string,
}

export async function generateNearestParentLayout({
  data,
  timeScale,
  currentApxCharacterWidth,
  minimumNodeEdgeGap,
}: FactoryArgs): Promise<NodesLayout> {
  const layout: NodesLayout = {}

  async function generate(): Promise<void> {
    for await (const [, item] of data) {
      if (!item.start) {
        continue
      }

      const endAsPx = timeScale.dateToX(item.end ?? new Date())
      // Accommodate the label width so they don't overlap
      const apxLabelWidth = item.label.length * currentApxCharacterWidth
      const endX = endAsPx + apxLabelWidth

      const startX = timeScale.dateToX(new Date(item.start))

      const row = await getNearestParentRow(item, startX)

      layout[item.id] = {
        row,
        startX,
        endX,
      }
    }
  }

  async function getNearestParentRow(nodeData: TimelineItem, nodeStartX: number): Promise<number> {
  // if one dependency
    if (nodeData.upstream.length === 1) {
      if (nodeData.upstream[0] in layout) {
        const parent = layout[nodeData.upstream[0]]
        return await placeNearUpstreamNode(parent, nodeStartX)
      }

      console.warn('timelineNodes layout worker: Parent node not found in layout', nodeData.upstream[0])
      return DEFAULT_POSITION
    }

    // if more than one dependency – add to the middle of upstream dependencies
    if (nodeData.upstream.length > 0) {
      const upstreamLayoutItems = nodeData.upstream
        .map(id => layout[id])
        .filter((layoutItem: NodeLayoutItem | undefined): layoutItem is NodeLayoutItem => !!layoutItem)
      const upstreamPositions = upstreamLayoutItems.map(layoutItem => layoutItem.row)
      const upstreamPositionSum = upstreamPositions.reduce((sum, position) => sum + position, 0)
      const upstreamPositionAverage = upstreamPositionSum / upstreamPositions.length

      const position = Math.round(upstreamPositionAverage)

      if (isPositionTaken(nodeStartX, position)) {
        const overlappingLayoutIds = getOverlappingLayoutIds(
          nodeStartX,
          position,
        )!

        const upstreamDependenciesOverlapping = overlappingLayoutIds.filter(layoutId => {
          return nodeData.upstream.includes(layoutId)
        })

        if (upstreamDependenciesOverlapping.length > 0 || overlappingLayoutIds.length > 1) {
        // upstream nodeData dependencies always win, or if there are more than one node in the way
          const [upstreamLayoutItemId] = upstreamDependenciesOverlapping.length > 0
            ? upstreamDependenciesOverlapping
            : overlappingLayoutIds
          const upstreamLayoutItem = layout[upstreamLayoutItemId]

          upstreamLayoutItem.nextDependencyShove = getShoveDirectionWeightedByDependencies(
            upstreamPositions,
            position,
            upstreamLayoutItem.nextDependencyShove,
          )

          return await placeNearUpstreamNode(upstreamLayoutItem, nodeStartX)
        }

        return await argueWithCompetingUpstreamPlacement({
          competingLayoutItemId: overlappingLayoutIds[0],
          upstreamPositions,
          nodeStartX,
          desiredPosition: position,
        })
      }
    }

    // if zero dependencies
    return placeRootNode(nodeStartX, DEFAULT_POSITION)
  }

  function placeRootNode(nodeStartX: number, DEFAULT_POSITION: number): number {
    if (isPositionTaken(nodeStartX, DEFAULT_POSITION)) {
      return placeRootNode(nodeStartX, DEFAULT_POSITION + 1)
    }

    return DEFAULT_POSITION
  }

  async function placeNearUpstreamNode(upstreamLayoutItem: NodeLayoutItem, nodeStartX: number): Promise<number> {
  // See this diagram for how shove logic works in this scenario
  // https://www.figma.com/file/1u1oXkiYRxgtqWSRG9Yely/DAG-Design?node-id=385%3A2782&t=yRLIggko0TzbMaIG-4
    if (upstreamLayoutItem.nextDependencyShove !== 1 && upstreamLayoutItem.nextDependencyShove !== -1) {
      upstreamLayoutItem.nextDependencyShove = 1
    }

    const {
      row: upstreamNodePosition,
      nextDependencyShove,
    } = upstreamLayoutItem
    if (isPositionTaken(nodeStartX, upstreamNodePosition)) {
      if (nextDependencyShove === 1 && !isPositionTaken(nodeStartX, upstreamNodePosition + 1)) {
        upstreamLayoutItem.nextDependencyShove = -1
        return upstreamNodePosition + 1
      } else if (!isPositionTaken(nodeStartX, upstreamNodePosition - 1)) {
        upstreamLayoutItem.nextDependencyShove = 1
        return upstreamNodePosition - 1
      }
      await shove({
        direction: nextDependencyShove,
        nodeStartX,
        desiredPosition: upstreamNodePosition + nextDependencyShove,
      })
      upstreamLayoutItem.nextDependencyShove = nextDependencyShove === 1 ? -1 : 1
      return upstreamNodePosition + nextDependencyShove
    }
    return upstreamNodePosition
  }

  function isPositionTaken(nodeStartX: number, position: number): boolean {
    const layoutKeys = Object.keys(layout)
    return layoutKeys.length > 0 && layoutKeys.some((nodeId) => {
      const layoutItem = layout[nodeId]
      return isNodesOverlapping({
        firstNodeEndX: layoutItem.endX,
        firstNodePosition: layoutItem.row,
        lastNodeStartX: nodeStartX,
        lastNodePosition: position,
      })
    })
  }

  async function shove({ direction, nodeStartX, desiredPosition }: ShoveProps): Promise<void> {
    const overlappingLayoutIds = getOverlappingLayoutIds(nodeStartX, desiredPosition)

    if (!overlappingLayoutIds) {
      return
    }

    for await (const overlapId of overlappingLayoutIds) {
    // push nodes and recursively shove as needed
      const layoutItem = layout[overlapId]
      const newPosition = layoutItem.row + direction
      await shove({
        direction,
        nodeStartX: layoutItem.startX,
        desiredPosition: newPosition,
      })
      layoutItem.row = newPosition
    }
  }

  function isNodesOverlapping({
    firstNodeEndX,
    firstNodePosition,
    lastNodeStartX,
    lastNodePosition,
  }: IsNodesOverlappingProps): boolean {
    return firstNodePosition === lastNodePosition
    && firstNodeEndX + minimumNodeEdgeGap >= lastNodeStartX
  }

  function getOverlappingLayoutIds(nodeStartX: number, position: number): string[] | undefined {
    const overlappingLayoutItems: string[] = []

    Object.keys(layout).forEach(itemId => {
      const layoutItem = layout[itemId]

      const isItemOverlapping = isNodesOverlapping({
        firstNodeEndX: layoutItem.endX,
        firstNodePosition: layoutItem.row,
        lastNodeStartX: nodeStartX,
        lastNodePosition: position,
      })

      if (isItemOverlapping) {
        overlappingLayoutItems.push(itemId)
      }
    })

    if (overlappingLayoutItems.length === 0) {
      return
    }

    // sort last to first
    overlappingLayoutItems.sort((itemAId, itemBId) => {
      const itemA = layout[itemAId]
      const itemB = layout[itemBId]
      if (itemA.endX < itemB.endX) {
        return 1
      }
      if (itemA.endX > itemB.endX) {
        return -1
      }
      return 0
    })

    return overlappingLayoutItems
  }

  function getShoveDirectionWeightedByDependencies(
    upstreamPositions: number[],
    position: number,
    defaultGravity?: NodeShoveDirection,
  ): NodeShoveDirection {
  // check if nodeData has more connections above or below, prefer placement in that direction
    const upwardConnections = upstreamPositions.filter((upstreamPosition) => upstreamPosition < position).length
    const downwardConnections = upstreamPositions.filter((upstreamPosition) => upstreamPosition > position).length

    if (upwardConnections > downwardConnections) {
      return -1
    }

    return defaultGravity ?? 1
  }
  async function argueWithCompetingUpstreamPlacement({
    desiredPosition,
    nodeStartX,
    upstreamPositions,
    competingLayoutItemId,
  }: ArgueWithCompetingUpstreamPlacementProps): Promise<number> {
    const competitor = layout[competingLayoutItemId]
    const [
      competitorAboveConnections,
      competitorBelowConnections,
    ] = getLayoutItemUpAndDownwardConnections(competingLayoutItemId)
    const nodeAboveConnections = upstreamPositions.filter((upstreamPosition) => upstreamPosition < desiredPosition).length
    const nodeBelowConnections = upstreamPositions.filter((upstreamPosition) => upstreamPosition > desiredPosition).length

    if (nodeAboveConnections > nodeBelowConnections) {
    // node has more above
      if (
        competitorAboveConnections > competitorBelowConnections && competitorAboveConnections > nodeAboveConnections
      ) {
      // competitor has more above than below, and more above than node
      // node wins, shove competitor up
        await shove({
          direction: -1,
          nodeStartX,
          desiredPosition,
        })
        return desiredPosition
      }
      if (competitorBelowConnections > competitorAboveConnections) {
      // competitor has more below than above
      // node wins, shove competitor down
        await shove({
          direction: 1,
          nodeStartX,
          desiredPosition,
        })
        return desiredPosition
      }

      // competitor has equal above and below, or node has more above
      // place node above competitor
      competitor.nextDependencyShove = -1
    }

    if (nodeBelowConnections > nodeAboveConnections) {
    // node has more below
      if (
        competitorBelowConnections > competitorAboveConnections && competitorBelowConnections > nodeBelowConnections
      ) {
      // competitor has more below than above, and more below than node
      // node wins, shove competitor down
        await shove({
          direction: 1,
          nodeStartX,
          desiredPosition,
        })
        return desiredPosition
      }

      if (competitorAboveConnections > competitorBelowConnections) {
      // competitor has more above than below
      // node wins, shove competitor up
        await shove({
          direction: -1,
          nodeStartX,
          desiredPosition,
        })
        return desiredPosition
      }

      // competitor has equal above and below, or node has more below
      // place node below competitor
      competitor.nextDependencyShove = 1
    }

    return await placeNearUpstreamNode(competitor, nodeStartX)
  }

  function getLayoutItemUpAndDownwardConnections(id: string): [number, number] {
    const connections = data.get(id)!
    const layoutItem = layout[id]

    return connections.upstream.reduce((counts, dependencyId) => {
      if (id in layout) {
        const dependencyLayoutItem = layout[dependencyId]

        if (dependencyLayoutItem.row < layoutItem.row) {
          counts[0] += 1
        }

        if (dependencyLayoutItem.row > layoutItem.row) {
          counts[1] += 1
        }

        return counts
      }

      console.warn('nodeLayout.worker.ts: Parent node not found on layout data', id)
      return counts
    }, [0, 0])
  }

  await generate()

  return layout

}