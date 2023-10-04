import { useSubscription } from '@prefecthq/vue-compositions'
import { watch } from 'vue'
import { RunGraphData } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { effectScopeFactory } from '@/utilities/effectScopeFactory'

type GraphDataFactoryCallback = (data: RunGraphData) => void

type GraphDataFactory = {
  fetch: (runId: string, callback: GraphDataFactoryCallback) => Promise<void>,
  stop: () => void,
}

export function graphDataFactory(): GraphDataFactory {
  const scope = effectScopeFactory()

  async function fetch(runId: string, callback: GraphDataFactoryCallback): Promise<void> {
    const config = await waitForConfig()

    scope.stop()
    scope.run(() => {

      // todo: need to account for an interval for running states
      // I think I can just pass in an empty but reactive set of options
      // and then update with the correct interval once the initial response is received
      const subscription = useSubscription(config.fetch, [runId])

      watch(() => subscription.response, response => {
        if (response) {
          callback(response)
        }
      }, { immediate: true })
    })
  }

  function stop(): void {
    scope.stop()
  }

  return {
    fetch,
    stop,
  }
}