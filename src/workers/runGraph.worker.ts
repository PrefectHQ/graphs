import { horizontalScaleFactory } from '@/factories/position'
import { NodeLayoutResponse } from '@/models/layout'
import { exhaustive } from '@/utilities/exhaustive'
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

function handleLayoutMessage({ nodes, settings }: ClientLayoutMessage): void {
  let y = 0
  const scale = horizontalScaleFactory(settings)
  const layout: NodeLayoutResponse = new Map()

  nodes.forEach(({ node }, nodeId) => {
    layout.set(nodeId, {
      x: scale(node.start_time),
      y: y++,
    })
  })

  post({
    type: 'layout',
    layout,
  })
}

