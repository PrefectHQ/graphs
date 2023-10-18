import { HorizontalPositionSettings } from '@/factories/position'
import { NodeLayoutRequest, NodeLayoutResponse } from '@/models/layout'

// eslint-disable-next-line import/default
import RunGraphWorker from '@/workers/runGraph.worker?worker'

export type ClientMessage = ClientLayoutMessage
export type WorkerMessage = WorkerLayoutMessage

export type ClientLayoutMessage = {
  type: 'layout',
  nodes: NodeLayoutRequest,
  settings: HorizontalPositionSettings,
}

export type WorkerLayoutMessage = {
  type: 'layout',
  layout: NodeLayoutResponse,
}

export interface IRunGraphWorker extends Omit<Worker, 'postMessage' | 'onmessage'> {
  postMessage: (command: ClientMessage, transfer?: Transferable[]) => void,
  onmessage: ((this: Worker, event: MessageEvent<WorkerMessage>) => void) | null,
}

export function layoutWorkerFactory(onmessage: IRunGraphWorker['onmessage']): IRunGraphWorker {
  const worker = new RunGraphWorker() as IRunGraphWorker

  worker.onmessage = onmessage

  return worker
}
