import { watch } from 'vue'
import { RunGraphConfig } from '@/models/RunGraph'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { waitForScope } from '@/objects/scope'

let config: RunGraphConfig | null = null

export async function startConfig(runConfig: () => RunGraphConfig): Promise<void> {
  const scope = await waitForScope()

  scope.run(() => {
    watch(runConfig, value => {
      const event: EventKey = config ? 'configUpdated' : 'configCreated'

      config = value

      emitter.emit(event, config)
    }, { immediate: true })
  })
}

export function stopConfig(): void {
  config = null
}

export async function waitForConfig(): Promise<RunGraphConfig> {
  if (config) {
    return config
  }

  return await waitForEvent('configCreated')
}