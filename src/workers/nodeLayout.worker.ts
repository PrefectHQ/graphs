import { createTimelineScale } from '../pixiFunctions/timelineScale'
import {
  TimelineNodeData,
  TimelineNodesLayoutOptions,
  NodeLayoutWorkerProps,
  NodeShoveDirection,
  NodesLayout,
  TimelineScale,
  NodeLayoutItem
} from '@/models'

const defaultPosition = 0

let timelineScale: TimelineScale | undefined

let currentTextMWidth = 14
let minimumNodeEdgeGap = 0
let currentLayoutSetting: TimelineNodesLayoutOptions = 'waterfall'
let graphDataStore: TimelineNodeData[] = []

const layout: NodesLayout = {}

onmessage = ({
  data: {
    layoutSetting,
    graphData,
    textMWidth,
    spacingMinimumNodeEdgeGap,
    timeScaleProps,
  },
}: NodeLayoutWorkerProps) => {
  if (!graphData) {
    console.warn('nodeLayout worker: called without graphData, exiting.')
    return
  }

  if (spacingMinimumNodeEdgeGap) {
    minimumNodeEdgeGap = spacingMinimumNodeEdgeGap
  }

  if (layoutSetting) {
    currentLayoutSetting = layoutSetting
  }

  if (textMWidth) {
    currentTextMWidth = textMWidth
  }

  if (!timelineScale && timeScaleProps) {
    const {
      minimumStartTime,
      overallGraphWidth,
      initialOverallTimeSpan,
    } = timeScaleProps
    timelineScale = createTimelineScale({
      minimumStartTime,
      overallGraphWidth,
      initialOverallTimeSpan,
    })
  }

  if (timelineScale) {
    graphDataStore = JSON.parse(graphData) as TimelineNodeData[]
    calculateNodeLayout()
  }
}

async function calculateNodeLayout(): Promise<void> {

  if (currentLayoutSetting === 'waterfall') {
    generateWaterfallLayout()
  }

  if (currentLayoutSetting === 'nearestParent') {
    await generateNearestParentLayout()
  }

  postMessage(layout)
}

function generateWaterfallLayout(): void {
  graphDataStore.forEach((nodeData, index) => {
    if (nodeData.id in layout) {
      return
    }

    layout[nodeData.id] = {
      position: index,
      startX: timelineScale!.dateToX(new Date(nodeData.start)),
      endX: timelineScale!.dateToX(nodeData.end ? new Date(nodeData.end) : new Date()),
    }
  })
}

async function generateNearestParentLayout(): Promise<void> {
  for await (const nodeData of graphDataStore) {
    const endAsPx = timelineScale!.dateToX(nodeData.end ? new Date(nodeData.end) : new Date())
    // Accommodate the label width so they don't overlap
    const apxLabelWidth = nodeData.label.length * currentTextMWidth
    const endX = endAsPx + apxLabelWidth

    if (nodeData.id in layout) {
      layout[nodeData.id].endX = endX
      continue
    }

    const startX = timelineScale!.dateToX(new Date(nodeData.start))

    const position = await getNearestParentPosition(nodeData, startX)

    layout[nodeData.id] = {
      position,
      startX,
      endX: endX,
    }
  }
}

async function getNearestParentPosition(nodeData: TimelineNodeData, nodeStartX: number): Promise<number> {
  // if one dependency
  if (nodeData.upstreamDependencies && nodeData.upstreamDependencies.length === 1) {
    if (nodeData.upstreamDependencies[0] in layout) {
      const parent = layout[nodeData.upstreamDependencies[0]]
      return await placeNearUpstreamNode(parent, nodeStartX)
    }

    console.warn('timelineNodes layout worker: Parent node not found in layout', nodeData.upstreamDependencies[0])
    return defaultPosition
  }

  // if more than one dependency – add to the middle of upstream dependencies
  if (nodeData.upstreamDependencies && nodeData.upstreamDependencies.length > 0) {
    const upstreamLayoutItems = nodeData.upstreamDependencies
      .map(id => layout[id])
      .filter((layoutItem: NodeLayoutItem | undefined): layoutItem is NodeLayoutItem => !!layoutItem)
    const upstreamPositions = upstreamLayoutItems.map(layoutItem => layoutItem.position)
    const upstreamPositionSum = upstreamPositions.reduce((sum, position) => sum + position, 0)
    const upstreamPositionAverage = upstreamPositionSum / upstreamPositions.length

    const position = Math.round(upstreamPositionAverage)

    if (isPositionTaken(nodeStartX, position)) {
      const overlappingLayoutIds = getOverlappingLayoutIds(
        nodeStartX,
        position,
      )!

      const upstreamDependenciesOverlapping = overlappingLayoutIds.filter(layoutId => {
        return nodeData.upstreamDependencies?.includes(layoutId)
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
  return placeRootNode(nodeStartX, defaultPosition)
}

function placeRootNode(nodeStartX: number, defaultPosition: number): number {
  if (isPositionTaken(nodeStartX, defaultPosition)) {
    return placeRootNode(nodeStartX, defaultPosition + 1)
  }

  return defaultPosition
}

async function placeNearUpstreamNode(upstreamLayoutItem: NodeLayoutItem, nodeStartX: number): Promise<number> {
  // See this diagram for how shove logic works in this scenario
  // https://www.figma.com/file/1u1oXkiYRxgtqWSRG9Yely/DAG-Design?node-id=385%3A2782&t=yRLIggko0TzbMaIG-4
  if (upstreamLayoutItem.nextDependencyShove !== 1 && upstreamLayoutItem.nextDependencyShove !== -1) {
    upstreamLayoutItem.nextDependencyShove = 1
  }

  const {
    position: upstreamNodePosition,
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
      firstNodePosition: layoutItem.position,
      lastNodeStartX: nodeStartX,
      lastNodePosition: position,
    })
  })
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
    const layoutItem = layout[overlapId]
    const newPosition = layoutItem.position + direction
    await shove({
      direction,
      nodeStartX: layoutItem.startX,
      desiredPosition: newPosition,
    })
    layoutItem.position = newPosition
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

  Object.keys(layout).forEach(itemId => {
    const layoutItem = layout[itemId]

    const isItemOverlapping = isNodesOverlapping({
      firstNodeEndX: layoutItem.endX,
      firstNodePosition: layoutItem.position,
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
  const data = graphDataStore.find(nodeData => nodeData.id === id)!
  const layoutItem = layout[id]

  return data.upstreamDependencies?.reduce((counts, dependencyId) => {
    if (id in layout) {
      const dependencyLayoutItem = layout[dependencyId]

      if (dependencyLayoutItem.position < layoutItem.position) {
        counts[0] += 1
      }

      if (dependencyLayoutItem.position > layoutItem.position) {
        counts[1] += 1
      }

      return counts
    }

    console.warn('nodeLayout.worker.ts: Parent node not found on layout data', id)
    return counts
  }, [0, 0]) ?? [0, 0]
}
