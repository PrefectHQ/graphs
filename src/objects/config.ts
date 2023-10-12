import { watch } from 'vue'
import { RequiredGraphConfig, RunGraphConfig, RunGraphProps } from '@/models/RunGraph'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { waitForScope } from '@/objects/scope'

let config: RequiredGraphConfig | null = null

const defaults = {
  animationDuration: 500,
  nodeRenderKey: (node) => `${node.id},${node.kind},${node.start_time},${node.end_time},${node.state_type},${node.label}`,
  styles: {
    nodeHeight: 30,
    nodeMargin: 2,
    node: () => ({
      background: '#ffffff',
    }),
  },
} as const satisfies Omit<RequiredGraphConfig, 'runId' | 'fetch'>

function withDefaults(config: RunGraphConfig): RequiredGraphConfig {
  return {
    runId: config.runId,
    fetch: config.fetch,
    animationDuration: config.animationDuration ?? defaults.animationDuration,
    nodeRenderKey: config.nodeRenderKey ?? defaults.nodeRenderKey,
    styles: {
      nodeHeight: config.styles?.nodeHeight ?? defaults.styles.nodeHeight,
      nodeMargin: config.styles?.nodeMargin ?? defaults.styles.nodeMargin,
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