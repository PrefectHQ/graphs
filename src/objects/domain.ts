import { UseSubscription, useSubscription } from '@prefecthq/vue-compositions'
import { watch } from 'vue'
import { RunGraphConfig, RunGraphFetch } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { effectScopeFactory } from '@/utilities/effectScope'

export type RunGraphDomain = [Date, Date]

let subscription: UseSubscription<RunGraphFetch> | null = null
let domain: RunGraphDomain | null = null

const scope = effectScopeFactory()

export async function startDomain(): Promise<void> {
  const config = await waitForConfig()

  startSubscription(config)

  emitter.on('configUpdated', startSubscription)
}

export function stopDomain(): void {

}


function startSubscription({ fetch, runId }: RunGraphConfig): void {
  scope.run(() => {
    stopSubscription()

    // todo: need to account for an interval for running states
    // I think I can just pass in an empty but reactive set of options
    // and then update with the correct interval once the initial response is received
    subscription = useSubscription(fetch, [runId])

    watch(() => subscription?.response, response => {
      if (!response) {
        return
      }
      const event: EventKey = domain ? 'domainUpdated' : 'domainCreated'

      const start = response.start_time
      const end = response.end_time ?? new Date()
      domain = [start, end]

      emitter.emit(event, domain)
    }, { immediate: true })
  })
}

function stopSubscription(): void {
  scope.stop()
  subscription = null
}

export async function waitForDomain(): Promise<RunGraphDomain> {
  if (domain) {
    return await domain
  }

  return waitForEvent('domainCreated')
}