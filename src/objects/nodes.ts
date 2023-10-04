import { UseSubscription, useSubscription } from '@prefecthq/vue-compositions'
import { watch } from 'vue'
import { RunGraphConfig, RunGraphFetch } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScales } from '@/objects/scales'
import { waitForViewport } from '@/objects/viewport'
import { effectScopeFactory } from '@/utilities/effectScope'

let subscription: UseSubscription<RunGraphFetch> | null = null

const scope = effectScopeFactory()

export async function startNodes(): Promise<void> {
  const viewport = await waitForViewport()
  const { scaleX, scaleY } = await waitForScales()
  const config = await waitForConfig()

  startSubscription(config)

  emitter.on('configUpdated', startSubscription)
}

export function stopNodes(): void {
  stopSubscription()
}

function startSubscription({ fetch, runId }: RunGraphConfig): void {
  scope.run(() => {
    stopSubscription()

    // todo: need to account for an interval for running states
    // I think I can just pass in an empty but reactive set of options
    // and then update with the correct interval once the initial response is received
    subscription = useSubscription(fetch, [runId])

    watch(() => subscription?.response, response => {
      console.log({ response })
    }, { immediate: true })
  })
}

function stopSubscription(): void {
  scope.stop()
  subscription = null
}