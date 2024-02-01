import { millisecondsInSecond } from 'date-fns/constants'
import { RunGraphData, Artifact } from '@/models'
import { waitForConfig } from '@/objects/config'

type DataFactoryBundle = {
  data: RunGraphData,
  artifacts: Artifact[],
}

type DataCallback = (dataBundle: DataFactoryBundle) => void

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function dataFactory(runId: string, callback: DataCallback) {
  const config = await waitForConfig()

  let interval: ReturnType<typeof setInterval> | undefined = undefined
  let data: RunGraphData | null = null

  async function start(): Promise<void> {
    try {
      const [graphData, artifacts] = await Promise.all([
        config.fetchGraph(runId),
        config.fetchArtifacts(runId),
      ])
      data = graphData

      callback({
        data,
        artifacts,
      })
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