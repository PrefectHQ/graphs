import { WorkerMessage, ClientMessage } from '@/workers/runGraph'

onmessage = onMessageHandler

function onMessageHandler({ data }: MessageEvent<ClientMessage>): void {
  switch (data.type) {
    case 'ping':
      console.log('ping')
      post({ type: 'pong' })
      return
    default:
      const exhaustive: never = data.type
      throw new Error(`data.type does not have a handler associated with it: ${exhaustive}`)
  }
}

function post(message: WorkerMessage): void {
  postMessage(message)
}
