import { GraphTimelineNode, NodesLayout } from '@/models'

export function generateWaterfallLayout(data: GraphTimelineNode[]): NodesLayout {
  const layout: NodesLayout = {}

  data.forEach((nodeData, index) => {
    layout[nodeData.id] = {
      position: index,
      startX: 0,
      endX: 0,
    }
  })

  return layout
}