import { IApplicationOptions } from '@pixi/webworker'
// eslint-disable-next-line import/default
import RunGraphWorker from '@/workers/runGraph.worker?worker'

export type ClientMessage = ClientApplicationInitializationMessage
export type WorkerMessage = WorkerHelloWorldMessage

export type ClientApplicationInitializationMessage = {
  type: 'application',
  options: Partial<IApplicationOptions>,
}

export type WorkerHelloWorldMessage = {
  type: 'hello-world',
}

export interface IRunGraphWorker extends Omit<Worker, 'postMessage'> {
  postMessage: (command: ClientMessage, transfer: Transferable[]) => void,
  onmessage: ((this: Worker, ev: MessageEvent<WorkerMessage>) => void) | null,
}

export const worker: IRunGraphWorker = new RunGraphWorker()
