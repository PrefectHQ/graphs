import merge from 'lodash.merge'
import { watch } from 'vue'
import { RequiredGraphConfig, RunGraphConfig, RunGraphProps } from '@/models/RunGraph'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { waitForScope } from '@/objects/scope'

let config: RequiredGraphConfig | null = null

const defaults: Omit<RequiredGraphConfig, 'runId' | 'fetch'> = {
  animationDuration: 500,
  disableAnimationsThreshold: 500,
  disableEdgesThreshold: 100,
  styles: {
    rowGap: 16,
    columnGap: 32,
    textDefault: '#ffffff',
    nodesPadding: 16,
    nodeHeight: 32,
    nodePadding: 4,
    nodeRadius: 6,
    nodeBorderRadius: 9,
    nodeToggleSize: 28,
    nodeToggleBorderRadius: 6,
    nodeToggleBorderColor: '#51525C',
    nodeSelectedBorderColor: '#3fa2c3',
    edgeColor: '#51525C',
    guideLineWidth: 1,
    guideLineColor: '#51525C',
    guideTextTopPadding: 8,
    guideTextLeftPadding: 8,
    guideTextSize: 12,
    guideTextColor: '#ADADAD',
    node: () => ({
      background: '#ffffff',
      colorOnBackground: '#ffffff',
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
      console.log('Config updated')
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