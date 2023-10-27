import { NodesLayoutResponse } from '@/models/layout'
import { exhaustive } from '@/utilities/exhaustive'
import { getHorizontalLayout } from '@/workers/layouts/horizontal'
import { getVerticalLayout } from '@/workers/layouts/vertical'
import { WorkerMessage, ClientMessage, ClientLayoutMessage } from '@/workers/runGraph'

onmessage = onMessageHandler

function onMessageHandler({ data }: MessageEvent<ClientMessage>): void {
  const { type } = data

  switch (type) {
    case 'layout':
      handleLayoutMessage(data)
      return
    default:
      exhaustive(type)
  }
}

function post(message: WorkerMessage): void {
  postMessage(message)
}

async function handleLayoutMessage(message: ClientLayoutMessage): Promise<void> {
  const { data } = message
  const horizontalLayout = getHorizontalLayout(message)
  const verticalLayout = await getVerticalLayout(message, horizontalLayout)
  const layout: NodesLayoutResponse = new Map()

  for (const [nodeId, node] of data.nodes) {
    const horizontal = horizontalLayout.get(nodeId)
    const vertical = verticalLayout.get(nodeId)

    if (horizontal === undefined) {
      console.warn(`NodeId not found in horizontal layout: Skipping ${node.label}`)
      continue
    }

    if (vertical === undefined) {
      console.warn(`NodeId not found in vertical layout: Skipping ${node.label}`)
      continue
    }

    layout.set(nodeId, {
      ...horizontal,
      y: vertical,
      row: vertical,
    })
  }

  post({
    type: 'layout',
    layout,
  })
}
