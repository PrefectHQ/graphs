import { GraphPostLayout, GraphPreLayout } from '@/models/layout'

// eslint-disable-next-line import/default
import RunGraphWorker from '@/workers/runGraph.worker?worker'

export type ClientMessage = ClientApplicationInitializationMessage | ClientLayoutMessage
export type WorkerMessage = WorkerHelloWorldMessage | WorkerLayoutMessage

export type ClientApplicationInitializationMessage = {
  type: 'ping',
}

export type ClientLayoutMessage = {
  type: 'layout',
  layout: GraphPreLayout,
}

export type WorkerHelloWorldMessage = {
  type: 'pong',
}

export type WorkerLayoutMessage = {
  type: 'layout',
  layout: GraphPostLayout,
}

export interface IRunGraphWorker extends Omit<Worker, 'postMessage' | 'onmessage'> {
  postMessage: (command: ClientMessage, transfer?: Transferable[]) => void,
  onmessage: ((this: Worker, ev: MessageEvent<WorkerMessage>) => void) | null,
}

export function getLayoutWorker(onmessage: IRunGraphWorker['onmessage']): IRunGraphWorker {
  const worker = new RunGraphWorker() as IRunGraphWorker

  worker.onmessage = onmessage

  return worker
}
