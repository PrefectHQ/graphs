import { UseSubscription, useSubscription } from '@prefecthq/vue-compositions'
import { ComputedRef, MaybeRefOrGetter, computed, toValue } from 'vue'
import { RunGraphFetch } from '@/models/RunGraph'

type RunGraphsData = Record<string, UseSubscription<RunGraphFetch>>

function fetchAll(runIds: string[], fetch: RunGraphFetch): RunGraphsData {
  return runIds.reduce<RunGraphsData>((response, runId) => {
    response[runId] = useSubscription(fetch, [runId])

    return response
  }, {})
}

export type UseRunGraphData = {
  data: ComputedRef<RunGraphsData>,
  subscription: UseSubscription<typeof fetchAll>,
}

export function useRunGraphData(runIds: MaybeRefOrGetter<string[]>, fetch: RunGraphFetch): UseRunGraphData {
  const parameters = computed<[string[], RunGraphFetch]>(() => [toValue(runIds), fetch])
  const subscription = useSubscription(fetchAll, parameters)
  const data = computed(() => subscription.response ?? {})

  return {
    data,
    subscription,
  }
}
