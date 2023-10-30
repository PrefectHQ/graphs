import merge from 'lodash.merge'
import { watch } from 'vue'
import { RequiredGraphConfig, RunGraphConfig, RunGraphProps } from '@/models/RunGraph'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { waitForScope } from '@/objects/scope'

let config: RequiredGraphConfig | null = null

const defaults: Omit<RequiredGraphConfig, 'runId' | 'fetch'> = {
  animationDuration: 500,
  styles: {
    rowGap: 15,
    columnGap: 30,
    nodeHeight: 30,
    nodePadding: 4,
    nodeBorderRadius: 8,
    nodeToggleSize: 26,
    nodeToggleBorderRadius: 6,
    nodeToggleBorderColor: '#51525C',
    edgeColor: '#51525C',
    node: () => ({
      background: '#ffffff',
    }),
  },
}

function withDefaults(config: RunGraphConfig): RequiredGraphConfig {
  const value: RequiredGraphConfig = merge({}, defaults, config)

  value.styles.node = node => ({
    ...defaults.styles.node(node),
    ...config.styles?.node?.(node),
  })

  return value
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