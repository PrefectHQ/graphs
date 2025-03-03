import { RequiredGraphConfig, RunGraphStyles, RunGraphTheme } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { emitter, waitForEvent } from '@/objects/events'

const defaults: (theme: RunGraphTheme) => Required<RunGraphStyles> = (theme) => ({
  rowGap: 24,
  columnGap: 32,
  textDefault: theme === 'dark' ? '0.0, 0.0%, 100.0%' : '228 6%, 9.02%',
  textInverse: theme === 'dark' ? '0.0, 0.0%, 9.02%' : '0.0, 0.0%, 100.0%',
  selectedBorderColor: theme === 'dark' ? '195.0, 52.38%, 50.59%' : '195.1, 58.38%, 38.63%',
  selectedBorderWidth: 2,
  selectedBorderOffset: 4,
  selectedBorderRadius: 9,
  nodesPadding: 16,
  nodeHeight: 32,
  nodePadding: 4,
  nodeRadius: 6,
  nodeBorderRadius: 9,
  nodeToggleSize: 28,
  nodeToggleBgColor: '#35363C',
  nodeToggleBorderRadius: 6,
  nodeToggleBorderColor: theme === 'dark' ? '228 6% 32%' : '228 11.3% 76%',
  nodeUnselectedAlpha: 0.2,
  artifactsGap: 4,
  artifactsNodeOverlap: 4,
  artifactPaddingLeft: 2,
  artifactPaddingRight: 4,
  artifactPaddingY: 2,
  artifactTextColor: '#ffffff',
  artifactBgColor: '#35363b',
  artifactBorderRadius: 4,
  artifactContentGap: 4,
  artifactIconSize: 16,
  artifactIconColor: '#ffffff',
  flowStateBarHeight: 8,
  flowStateSelectedBarHeight: 10,
  flowStateAreaAlpha: 0.1,
  eventTargetSize: 30,
  eventBottomMargin: 4,
  eventSelectedBorderInset: 8,
  eventRadiusDefault: 4,
  eventColor: '#A564F9',
  eventClusterRadiusDefault: 6,
  eventClusterColor: '#A564F9',
  edgeColor: theme === 'dark' ? '0.0, 0.0%, 67.84%' : '228 6%, 48%',
  guideLineWidth: 1,
  guideLineColor: theme === 'dark' ? '228 6% 32%' : '228 11.3% 76%',
  guideTextTopPadding: 8,
  guideTextLeftPadding: 8,
  guideTextSize: 12,
  guideTextColor: theme === 'dark' ? '0.0, 0.0%, 67.84%' : '228 6%, 48%',
  playheadWidth: 2,
  playheadColor: '#6272FF',
  node: () => ({
    background: '#ffffff',
  }),
  state: () => ({
    background: '#ffffff',
  }),
})

let styles: Required<RunGraphStyles> | null = null

export async function startStyles(): Promise<void> {
  const config = await waitForConfig()

  styles = getStyles(config)

  emitter.emit('stylesCreated', styles)

  emitter.on('configUpdated', (config) => {
    styles = getStyles(config)
    emitter.emit('stylesUpdated', styles)
  })
}

export function stopStyles(): void {
  styles = null
}

export async function waitForStyles(): Promise<Required<RunGraphStyles>> {
  if (styles) {
    return styles
  }

  return await waitForEvent('stylesCreated')
}

function getStyles(config: RequiredGraphConfig): Required<RunGraphStyles> {
  return {
    ...defaults(config.theme),
    ...config.styles?.(config.theme),
  }
}
