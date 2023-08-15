import { NodesLayout } from '@/models'
import { TimelineData } from '@/types/timeline'

export function generateWaterfallLayout(data: TimelineData): NodesLayout {
  const layout: NodesLayout = {}
  let index = 0

  data.forEach((item, id) => {
    layout[id] = {
      row: index,
      startX: 0,
      endX: 0,
    }

    index++
  })

  return layout
}