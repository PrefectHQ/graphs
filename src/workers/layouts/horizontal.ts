
import { horizontalScaleFactory } from '@/factories/position'
import { getColumns } from '@/utilities/columns'
import { ClientLayoutMessage } from '@/workers/runGraph'

export type HorizontalLayout = Map<string, number>

export function getHorizontalLayout(message: ClientLayoutMessage): HorizontalLayout {
  if (message.horizontalSettings.mode === 'dependency') {
    return getHorizontalDependencyLayout(message)
  }

  return getHorizontalTimeLayout(message)
}

function getHorizontalDependencyLayout({ data, horizontalSettings }: ClientLayoutMessage): HorizontalLayout {
  const levels = getColumns(data)
  const scale = horizontalScaleFactory(horizontalSettings)
  const layout: HorizontalLayout = new Map()

  data.nodes.forEach((node, nodeId) => {
    layout.set(nodeId, scale(levels.get(nodeId)!))
  })

  return layout
}

function getHorizontalTimeLayout({ data, horizontalSettings }: ClientLayoutMessage): HorizontalLayout {
  const scale = horizontalScaleFactory(horizontalSettings)
  const layout: HorizontalLayout = new Map()

  data.nodes.forEach((node, nodeId) => {
    layout.set(nodeId, scale(node.start_time))
  })

  return layout
}

