import { GraphPostLayout } from '@/models/layout'
import { WorkerMessage, ClientMessage, ClientLayoutMessage } from '@/workers/runGraph'

onmessage = onMessageHandler

function onMessageHandler({ data }: MessageEvent<ClientMessage>): void {
  const { type } = data

  switch (type) {
    case 'ping':
      console.log('ping')
      post({ type: 'pong' })
      return
    case 'layout':
      handleLayoutMessage(data)
      return
    default:
      const exhaustive: never = type
      throw new Error(`data.type does not have a handler associated with it: ${exhaustive}`)
  }
}

function post(message: WorkerMessage): void {
  postMessage(message)
}

function handleLayoutMessage({ layout: preLayout }: ClientLayoutMessage): void {
  let y = 0
  const postLayout: GraphPostLayout = new Map()

  preLayout.forEach((node, key) => {
    postLayout.set(key, {
      ...node,
      y: y++,
    })
  })

  post({
    type: 'layout',
    layout: postLayout,
  })
}
