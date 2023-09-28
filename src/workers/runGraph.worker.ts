import { Application } from '@pixi/webworker'
import { WorkerMessage, ClientApplicationInitializationMessage, ClientMessage } from '@/workers/runGraph'

onmessage = onMessageHandler

let application: Application

function onMessageHandler({ data }: MessageEvent<ClientMessage>): void {
  switch (data.type) {
    case 'application':
      return applicationInitializationMessageHandler(data)
    default:
      const exhaustive: never = data.type
      throw new Error(`data.type does not have a handler associated with it: ${exhaustive}`)
  }
}

function post(message: WorkerMessage): void {
  postMessage(message)
}

function applicationInitializationMessageHandler({ options }: ClientApplicationInitializationMessage): void {
  application = new Application(options)

  post({ type: 'hello-world' })
}
