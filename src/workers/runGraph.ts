import { HorizontalPositionSettings, VerticalPositionSettings } from '@/factories/position'
import { NodeLayoutResponse, NodeWidths } from '@/models/layout'
import { RunGraphData } from '@/models/RunGraph'

// eslint-disable-next-line import/default
import RunGraphWorker from '@/workers/runGraph.worker?worker'

export type ClientMessage = ClientLayoutMessage
export type WorkerMessage = WorkerLayoutMessage

export type ClientLayoutMessage = {
  type: 'layout',
  data: RunGraphData,
  widths: NodeWidths,
  horizontalSettings: HorizontalPositionSettings,
  verticalSettings: VerticalPositionSettings,
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
