import {
  TimelineNodesLayoutOptions,
  NodeLayoutWorkerArgs,
  NodesLayout,
  TimeScale,
  NodeLayoutWorkerResponseData
} from '@/models'
import { createTimeScale } from '@/pixiFunctions/timeScale'
import { TimelineData } from '@/types/timeline'
import { generateNearestParentLayout } from '@/workers/layouts/nearestNeighbor'
import { generateWaterfallLayout } from '@/workers/layouts/waterfall'

let timeScale: TimeScale | undefined

let currentApxCharacterWidth = 14
let minimumNodeEdgeGap = 0
let currentLayoutSetting: TimelineNodesLayoutOptions = 'waterfall'
let graphDataStore: TimelineData = new Map()

let layout: NodesLayout = {}

onmessage = async ({
  data: {
    layoutSetting,
    data,
    apxCharacterWidth,
    spacingMinimumNodeEdgeGap,
    timeScaleArgs,
    centerViewportAfter,
  },
}: { data: NodeLayoutWorkerArgs }) => {
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
  if (data && timeScale && layoutSetting) {
    graphDataStore = data
    await calculateNodeLayout()
    const response: NodeLayoutWorkerResponseData = {
      layout,
      centerViewportAfter,
    }
    console.log(layout)
    postMessage(response)
  }
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