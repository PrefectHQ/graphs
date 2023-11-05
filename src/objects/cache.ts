import { Action, ActionArguments, UseSubscription, useSubscription } from '@prefecthq/vue-compositions'

let subscriptions: UseSubscription<() => unknown>[] = []

export function startCache(): void {
  // do nothing
}

export function stopCache(): void {
  subscriptions.forEach(subscription => subscription.unsubscribe())
  subscriptions = []
}

export async function cache<T extends Action>(action: T, parameters: ActionArguments<T>): Promise<ReturnType<T>> {
  const subscription = useSubscription(action, parameters)

  subscriptions.push(subscription)

  await subscription.promise()

  return subscription.response!
}