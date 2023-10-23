import { NodeLayoutResponse } from '@/models/layout'
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
  const horizontal = getHorizontalLayout(message)
  const vertical = await getVerticalLayout(message, horizontal)
  const layout: NodeLayoutResponse = new Map()

  for (const [nodeId, node] of data.nodes) {
    const x = horizontal.get(nodeId)
    const y = vertical.get(nodeId)

    if (x === undefined) {
      console.warn(`NodeId not found in horizontal layout: Skipping ${node.label}`)
      return
    }

    if (y === undefined) {
      console.warn(`NodeId not found in vertical layout: Skipping ${node.label}`)
      return
    }

    layout.set(nodeId, {
      x,
      y,
    })
  }

  post({
    type: 'layout',
    layout,
  })
}
