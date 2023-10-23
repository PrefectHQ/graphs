import { HorizontalLayout } from '@/workers/layouts/horizontal'
import { ClientLayoutMessage } from '@/workers/runGraph'
import { getVerticalNearestParentLayout } from './nearestParentVertical'

export type VerticalLayout = Map<string, number>

export async function getVerticalLayout(message: ClientLayoutMessage, horizontal: HorizontalLayout): Promise<VerticalLayout> {
  if (message.verticalSettings.mode === 'nearest-parent') {
    return await getVerticalNearestParentLayout(message, horizontal)
  }

  return getVerticalWaterfallLayout(message)
}

function getVerticalWaterfallLayout(message: ClientLayoutMessage): VerticalLayout {
  const layout: VerticalLayout = new Map()

  let index = 0

  for (const [nodeId] of message.data.nodes) {
    layout.set(nodeId, index++)
  }

  return layout
}
