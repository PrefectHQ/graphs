import { SubscriptionOptions, UseSubscription, useSubscription } from '@prefecthq/vue-compositions'
import { ComputedRef, MaybeRefOrGetter, computed, toValue, watch } from 'vue'
import { RunGraphFetch } from '@/models/RunGraph'
import { ScaleXDomain, setScaleX } from '@/objects/scales'

export type UseRunGraphDomain = {
  subscription: UseSubscription<RunGraphFetch>,
  domain: ComputedRef<ScaleXDomain | null>,
}

export function useRunGraphDomain(runId: MaybeRefOrGetter<string>, fetch: RunGraphFetch, options?: SubscriptionOptions): UseRunGraphDomain {
  const parameters = computed<[string]>(() => [toValue(runId)])
  const subscription = useSubscription(fetch, parameters, options)
  const domain = computed<ScaleXDomain | null>(() => {
    const { response } = subscription

    if (!response) {
      return null
    }
    const start = response.start_time
    const end = response.end_time ?? new Date()

    return [start, end]
  })

  watch(domain, domain => {
    if (!domain) {
      return
    }

    setScaleX({ domain })
  }, { immediate: true })

  return {
    subscription,
    domain,
  }
}