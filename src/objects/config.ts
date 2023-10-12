import merge from 'lodash.merge'
import { watch } from 'vue'
import { RequiredGraphConfig, RunGraphConfig, RunGraphProps } from '@/models/RunGraph'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { waitForScope } from '@/objects/scope'

let config: RequiredGraphConfig | null = null

const defaults: Omit<RequiredGraphConfig, 'runId' | 'fetch'> = {
  animationDuration: 200,
  nodeRenderKey: (node) => `${node.id},${node.kind},${node.start_time},${node.end_time},${node.state_type},${node.label}`,
  styles: {
    nodeHeight: 30,
    nodeMargin: 2,
    node: () => ({
      background: '#ffffff',
    }),
  },
}

function withDefaults(config: RunGraphConfig): RequiredGraphConfig {
  const value: RequiredGraphConfig = merge({}, defaults, config)

  value.styles.node = thing => ({
    ...defaults.styles.node(thing),
    ...config.styles?.node?.(thing),
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