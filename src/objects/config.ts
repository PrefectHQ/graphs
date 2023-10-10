import { watch } from 'vue'
import { RequiredGraphConfig, RunGraphConfig, RunGraphProps } from '@/models/RunGraph'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { waitForScope } from '@/objects/scope'

let config: RequiredGraphConfig | null = null

const defaults = {
  styles: {
    nodeHeight: 20,
    node: () => ({
      background: '#ffffff',
    }),
  },
} as const satisfies Omit<RequiredGraphConfig, 'runId' | 'fetch'>

function withDefaults(config: RunGraphConfig): RequiredGraphConfig {
  return {
    runId: config.runId,
    fetch: config.fetch,
    styles: {
      nodeHeight: config.styles?.nodeHeight ?? defaults.styles.nodeHeight,
      node: node => ({
        ...defaults.styles.node(),
        ...config.styles?.node?.(node),
      }),
    },
  }
}

export async function startConfig(props: RunGraphProps): Promise<void> {
  const scope = await waitForScope()

  scope.run(() => {
    watch(() => props.config, value => {
      const event: EventKey = config ? 'configUpdated' : 'configCreated'

      config = withDefaults(value)

      emitter.emit(event, config)
    }, { immediate: true })
  })
}

export function stopConfig(): void {
  config = null
}

export async function waitForConfig(): Promise<RequiredGraphConfig> {
  if (config) {
    return config
  }

  return await waitForEvent('configCreated')
}