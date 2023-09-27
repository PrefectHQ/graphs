import { Application } from '@pixi/webworker'
import { IApplicationOptions } from 'pixi.js'

type MessageData = {
  data: Partial<IApplicationOptions>,
}

onmessage = ({ data }: MessageData) => {
  const application = new Application(data)
}
