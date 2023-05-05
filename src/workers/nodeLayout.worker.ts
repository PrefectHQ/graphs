import {
  GraphTimelineNode,
  TimelineNodesLayoutOptions,
  NodeLayoutWorkerProps,
  NodesLayout,
  TimeScale,
  NodeLayoutWorkerResponseData
} from '@/models'
import { createTimeScale } from '@/pixiFunctions/timeScale'
import { generateNearestParentLayout } from '@/workers/layouts/nearestNeighbor'
import { generateWaterfallLayout } from '@/workers/layouts/waterfall'

let timeScale: TimeScale | undefined

let currentApxCharacterWidth = 14
let minimumNodeEdgeGap = 0
let currentLayoutSetting: TimelineNodesLayoutOptions = 'waterfall'
let graphDataStore: GraphTimelineNode[] = []

let layout: NodesLayout = {}

onmessage = async ({
  data: {
    layoutSetting,
    graphData,
    apxCharacterWidth,
    spacingMinimumNodeEdgeGap,
    timeScaleArgs,
    centerViewportAfter,
  },
}: NodeLayoutWorkerProps) => {
  if (spacingMinimumNodeEdgeGap) {
    minimumNodeEdgeGap = spacingMinimumNodeEdgeGap
  }

  if (layoutSetting) {
    currentLayoutSetting = layoutSetting
  }

  if (apxCharacterWidth) {
    currentApxCharacterWidth = apxCharacterWidth
  }

  if (timeScaleArgs) {
    const {
      minimumStartTime,
      graphXDomain,
      initialOverallTimeSpan,
    } = timeScaleArgs
    timeScale = createTimeScale({
      minimumStartTime,
      graphXDomain,
      initialOverallTimeSpan,
    })
  }

  if (graphData) {
    const newData = JSON.parse(graphData) as GraphTimelineNode[]

    if (timeScale && (layoutSetting || graphDataStore !== newData)) {
      graphDataStore = prepareGraphData(newData)
      await calculateNodeLayout()
      const response: NodeLayoutWorkerResponseData = {
        layout,
        centerViewportAfter,
      }
      postMessage(response)
    }
  }
}

function prepareGraphData(data: GraphTimelineNode[]): GraphTimelineNode[] {
  return data
    .filter(isRenderableTimelineNode)
    .map(node => {
      // during serialization, dates are converted to strings
      // so we need to convert them back in this worker
      node.start = new Date(node.start)
      if (node.end) {
        node.end = new Date(node.end)
      }
      return node
    })
    .sort((nodeA, nodeB) => {
      return nodeA.start.getTime() - nodeB.start.getTime()
    })
}

function isRenderableTimelineNode(value: GraphTimelineNode): value is GraphTimelineNode & { start: Date } {
  return typeof value === 'object' && 'start' in value
}

async function calculateNodeLayout(): Promise<void> {
  if (currentLayoutSetting === 'waterfall') {
    layout = generateWaterfallLayout(graphDataStore)
  }

  if (currentLayoutSetting === 'nearestParent') {
    layout = await generateNearestParentLayout({
      data: graphDataStore,
      timeScale: timeScale!,
      currentApxCharacterWidth,
      minimumNodeEdgeGap,
    })
  }

  purgeNegativePositions()
}

function purgeNegativePositions(): void {
  const lowestPosition = Object.values(layout).reduce((lowest, layoutItem) => {
    if (layoutItem.row < lowest) {
      return layoutItem.row
    }
    return lowest
  }, 0)

  if (lowestPosition < 0) {
    Object.values(layout).forEach(layoutItem => {
      layoutItem.row += Math.abs(lowestPosition)
    })
  }
}