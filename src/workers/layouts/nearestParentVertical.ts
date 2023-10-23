import { HorizontalLayout } from '@/workers/layouts/horizontal'
import { VerticalLayout } from '@/workers/layouts/vertical'
import { RunGraphNode } from "@/models"
import { ClientLayoutMessage } from '@/workers/runGraph'

type NodeShoveDirection = 1 | -1
type NearestParentLayoutItem = {
  row: number,
  startX: number,
  endX: number,
  nextDependencyShove?: NodeShoveDirection
}
type NearestParentLayout = Map<string, NearestParentLayoutItem>

export async function getVerticalNearestParentLayout(message: ClientLayoutMessage, horizontal: HorizontalLayout): Promise<VerticalLayout> {
  const defaultNearestParentPosition = 0
  const minimumNodeEdgeGap = 16

  const nearestParentLayout: NearestParentLayout = new Map()
  const layout: VerticalLayout = new Map()

  for (const [nodeId] of message.data.nodes) {
    const node = message.data.nodes.get(nodeId)
    const nodeWidth = message.widths.get(nodeId)

    if (!node || !node.start_time || !nodeWidth) {
      console.warn('NearestParentLayout: Node ID was not found, has no start time or no width', nodeId)
      continue
    }

    const startX = horizontal.get(nodeId)!
    const endX = startX + nodeWidth

    const row = await getNearestParentPosition(node, startX)

    nearestParentLayout.set(nodeId, {
      row,
      startX,
      endX,
    })
  }

  for (const [nodeId] of nearestParentLayout) {
    const { row } = nearestParentLayout.get(nodeId)!
    layout.set(nodeId, row)
  }

  purgeNegativeLayoutPositions()

  return layout

  async function getNearestParentPosition(node: RunGraphNode, nodeStartX: number): Promise<number> {
    // if one dependency
    if (node.parents && node.parents.length === 1) {
      if ( nearestParentLayout.has(node.parents[0].id)) {
        const parent = nearestParentLayout.get(node.parents[0].id)!
        return await placeNearUpstreamNode(parent, nodeStartX)
      }

      console.warn('NearestParentLayout: Parent node not found in layout', node.parents[0].id)
      return defaultNearestParentPosition
    }

    // if more than one dependency – add to the middle of upstream dependencies
    if (node.parents && node.parents.length > 0) {
      const parentLayoutItems = node.parents
        .map(edge => nearestParentLayout.get(edge.id))
        .filter((layoutItem: NearestParentLayoutItem | undefined): layoutItem is NearestParentLayoutItem => !!layoutItem)

      const upstreamRows = parentLayoutItems.map(layoutItem => layoutItem.row)
      const upstreamRowsSum = upstreamRows.reduce((sum, position) => sum + position, 0)
      const upstreamRowsAverage = upstreamRowsSum / upstreamRows.length

      const row = Math.round(upstreamRowsAverage)

      if (isPositionTaken(nodeStartX, row)) {
        const overlappingLayoutIds = getOverlappingLayoutIds(
          nodeStartX,
          row,
        )!

        const upstreamDependenciesOverlapping = overlappingLayoutIds.filter(layoutId => {
          return node.parents?.some((edge) => edge.id === layoutId)
        })

        if (upstreamDependenciesOverlapping.length > 0 || overlappingLayoutIds.length > 1) {
          // upstream nodeData dependencies always win, or if there are more than one node in the way
          const [upstreamLayoutItemId] = upstreamDependenciesOverlapping.length > 0
            ? upstreamDependenciesOverlapping
            : overlappingLayoutIds
          const upstreamLayoutItem = nearestParentLayout.get(upstreamLayoutItemId)!

          upstreamLayoutItem.nextDependencyShove = getShoveDirectionWeightedByDependencies(
            upstreamRows,
            row,
            upstreamLayoutItem.nextDependencyShove,
          )

          return await placeNearUpstreamNode(upstreamLayoutItem, nodeStartX)
        }

        return await argueWithCompetingUpstreamPlacement({
          competingLayoutItemId: overlappingLayoutIds[0],
          upstreamPositions: upstreamRows,
          nodeStartX,
          desiredPosition: row,
        })
      }
    }

    // if zero dependencies
    return placeRootNode(nodeStartX, defaultNearestParentPosition)
  }

  function placeRootNode(nodeStartX: number, defaultPosition: number): number {
    if (isPositionTaken(nodeStartX, defaultPosition)) {
      return placeRootNode(nodeStartX, defaultPosition + 1)
    }

    return defaultPosition
  }

  async function placeNearUpstreamNode(upstreamLayoutItem: NearestParentLayoutItem, nodeStartX: number): Promise<number> {
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

  function isPositionTaken(nodeStartX: number, row: number): boolean {
    if (nearestParentLayout.size === 0) {
      return false
    }

    let positionTaken = false

    for (const [nodeId] of nearestParentLayout) {
      const layoutItem = nearestParentLayout.get(nodeId)!

      const overlapping = isNodesOverlapping({
        firstNodeEndX: layoutItem.endX,
        firstNodePosition: layoutItem.row,
        lastNodeStartX: nodeStartX,
        lastNodePosition: row,
      })

      if (overlapping) {
        positionTaken = true
        break
      }
    }

    return positionTaken
  }

  type ShoveProps = {
    direction: NodeShoveDirection,
    nodeStartX: number,
    desiredPosition: number,
  }
  async function shove({ direction, nodeStartX, desiredPosition }: ShoveProps): Promise<void> {
    const overlappingLayoutIds = getOverlappingLayoutIds(nodeStartX, desiredPosition)

    if (!overlappingLayoutIds) {
      return
    }

    for await (const overlapId of overlappingLayoutIds) {
      // push nodes and recursively shove as needed
      const layoutItem = nearestParentLayout.get(overlapId)!
      const newPosition = layoutItem.row + direction
      await shove({
        direction,
        nodeStartX: layoutItem.startX,
        desiredPosition: newPosition,
      })
      layoutItem.row = newPosition
    }
  }

  type IsNodesOverlappingProps = {
    firstNodeEndX: number,
    firstNodePosition: number,
    lastNodeStartX: number,
    lastNodePosition: number,
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

    nearestParentLayout.forEach((layoutItem, itemId) => {
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
      const itemA = nearestParentLayout.get(itemAId)!
      const itemB = nearestParentLayout.get(itemBId)!
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
    parentRows: number[],
    position: number,
    defaultGravity?: NodeShoveDirection,
  ): NodeShoveDirection {
    // check if node has more connections above or below, prefer placement in that direction
    const upwardConnections = parentRows.filter((upstreamPosition) => upstreamPosition < position).length
    const downwardConnections = parentRows.filter((upstreamPosition) => upstreamPosition > position).length

    if (upwardConnections > downwardConnections) {
      return -1
    }

    return defaultGravity ?? 1
  }

  type ArgueWithCompetingUpstreamPlacementProps = {
    desiredPosition: number,
    nodeStartX: number,
    upstreamPositions: number[],
    competingLayoutItemId: string,
  }
  async function argueWithCompetingUpstreamPlacement({
    desiredPosition,
    nodeStartX,
    upstreamPositions,
    competingLayoutItemId,
  }: ArgueWithCompetingUpstreamPlacementProps): Promise<number> {
    const competitor = nearestParentLayout.get(competingLayoutItemId)!
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
    const node = message.data.nodes.get(id)!
    const layoutItem = nearestParentLayout.get(id)!

    return node.parents?.reduce((counts, parent) => {
      if (nearestParentLayout.has(parent.id)) {
        const dependencyLayoutItem = nearestParentLayout.get(parent.id)!

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
    }, [0, 0]) ?? [0, 0]
  }

  function purgeNegativeLayoutPositions(): void {
    const allRows = Array.from( nearestParentLayout.values() ).map(layoutItem => layoutItem.row)
    const lowestRow = Math.min(...allRows)

    if (lowestRow < 0) {
      nearestParentLayout.forEach(layoutItem => {
        layoutItem.row += Math.abs(lowestRow)
      })
    }
  }
}