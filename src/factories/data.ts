import { DEFAULT_POLL_INTERVAL } from '@/consts'
import { RunGraphData } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'

type DataCallback = (data: RunGraphData) => void

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function dataFactory(runId: string, callback: DataCallback) {
  const config = await waitForConfig()

  let interval: ReturnType<typeof setInterval> | undefined = undefined

  async function start(): Promise<void> {
    const data = await config.fetch(runId)

    callback(data)

    if (!data.end_time) {
      interval = setTimeout(() => start(), DEFAULT_POLL_INTERVAL)
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