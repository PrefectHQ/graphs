import { MaybeRefOrGetter, toValue } from 'vue'
import { getIntervalForDataSize } from '@/factories/data'
import { RunGraphEvent, RunGraphFetchEventsOptions } from '@/models'
import { waitForConfig } from '@/objects/config'
import { waitForRunData } from '@/objects/nodes'

type EventDataCallback = (data: RunGraphEvent[]) => void

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function eventDataFactory(
  runId: string,
  callback: EventDataCallback,
  options?: MaybeRefOrGetter<RunGraphFetchEventsOptions>,
) {
  const runGraphData = await waitForRunData()
  const config = await waitForConfig()

  let interval: ReturnType<typeof setInterval> | undefined = undefined
  let data: RunGraphEvent[] | null = null

  async function start(): Promise<void> {
    try {
      data = await config.fetchEvents(runId, toValue(options))

      callback(data)
    } catch (error) {
      console.error(error)
    }

    if (!runGraphData.end_time) {
      interval = setTimeout(() => start(), getIntervalForDataSize(runGraphData))
    }
  }

  // todo: need a global way of stopping this when the graph is stopped
  function stop(): void {
    clearInterval(interval)
  }

  return {
    start,
    stop,
  }
}
