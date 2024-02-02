import merge from 'lodash.merge'
import { watch } from 'vue'
import { RequiredGraphConfig, RunGraphConfig, RunGraphProps } from '@/models/RunGraph'
import { emitter, waitForEvent } from '@/objects/events'
import { waitForScope } from '@/objects/scope'

let config: RequiredGraphConfig | null = null

const defaults: Omit<RequiredGraphConfig, 'runId' | 'fetch'> = {
  animationDuration: 500,
  disableAnimationsThreshold: 500,
  disableEdgesThreshold: 500,
  styles: {
    colorMode: 'dark',
    rowGap: 16,
    columnGap: 32,
    textDefault: '#ffffff',
    textInverse: '#000000',
    nodesPadding: 16,
    nodeHeight: 32,
    nodePadding: 4,
    nodeRadius: 6,
    nodeBorderRadius: 9,
    nodeToggleSize: 28,
    nodeToggleBgColor: '#35363C',
    nodeToggleBorderRadius: 6,
    nodeToggleBorderColor: '#51525C',
    nodeSelectedBorderColor: '#3fa2c3',
    nodeUnselectedAlpha: 0.2,
    artifactPaddingX: 6,
    artifactPaddingY: 2,
    artifactTextColor: '#ffffff',
    artifactBgColor: '#35363b',
    artifactBorderRadius: 6,
    edgeColor: '#51525C',
    guideLineWidth: 1,
    guideLineColor: '#51525C',
    guideTextTopPadding: 8,
    guideTextLeftPadding: 8,
    guideTextSize: 12,
    guideTextColor: '#ADADAD',
    playheadWidth: 2,
    playheadColor: '#6272FF',
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
      const newConfig = withDefaults(value)

      if (!config) {
        config = newConfig
        emitter.emit('configCreated', config)
        return
      }

      Object.assign(config, newConfig)
      emitter.emit('configUpdated', config)
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