import { HorizontalLayout } from '@/workers/layouts/horizontal'
import { ClientLayoutMessage } from '@/workers/runGraph'

type VerticalLayout = Map<string, number>

export function getVerticalLayout(message: ClientLayoutMessage, horizontal: HorizontalLayout): VerticalLayout {
  if (message.verticalSettings.mode === 'nearest-parent') {
    return getVerticalNearestParentLayout(message, horizontal)
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

function getVerticalNearestParentLayout(message: ClientLayoutMessage, horizontal: HorizontalLayout): VerticalLayout {
  throw new Error('Not implemented')
}