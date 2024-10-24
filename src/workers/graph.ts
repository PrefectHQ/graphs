import { HorizontalPositionSettings, VerticalPositionSettings } from '@/factories/position'
import { GraphData } from '@/models/Graph'
import { NodesLayoutResponse, NodeWidths } from '@/models/layout'

// eslint-disable-next-line import/default
import GraphWorker from '@/workers/graph.worker?worker&inline'

export type ClientMessage = ClientLayoutMessage
export type WorkerMessage = WorkerLayoutMessage

export type ClientLayoutMessage = {
  type: 'layout',
  data: GraphData,
  widths: NodeWidths,
  horizontalSettings: HorizontalPositionSettings,
  verticalSettings: VerticalPositionSettings,
}

export type WorkerLayoutMessage = {
  type: 'layout',
  layout: NodesLayoutResponse,
}

export interface IGraphWorker extends Omit<Worker, 'postMessage' | 'onmessage'> {
  postMessage: (command: ClientMessage, transfer?: Transferable[]) => void,
  onmessage: ((this: Worker, event: MessageEvent<WorkerMessage>) => void) | null,
}

export function layoutWorkerFactory(onmessage: IGraphWorker['onmessage']): IGraphWorker {
  const worker = new GraphWorker() as IGraphWorker

  worker.onmessage = onmessage

  return worker
}
