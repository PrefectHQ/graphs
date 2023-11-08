import { millisecondsInSecond } from 'date-fns'
import { RunGraphData } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'

type DataCallback = (data: RunGraphData) => void

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function dataFactory(runId: string, callback: DataCallback) {
  const config = await waitForConfig()

  let interval: ReturnType<typeof setInterval> | undefined = undefined
  let data: RunGraphData | null = null

  async function start(): Promise<void> {
    try {
      data = await config.fetch(runId)

      callback(data)
    } catch (error) {
      console.error(error)
    }


    if (data && !data.end_time) {
      interval = setTimeout(() => start(), getIntervalForDataSize(data))
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

function getIntervalForDataSize(data: RunGraphData): number {
  const intervalBasedOnNodeCount = Math.floor(data.nodes.size / millisecondsInSecond) * millisecondsInSecond

  return Math.max(millisecondsInSecond, intervalBasedOnNodeCount)
}