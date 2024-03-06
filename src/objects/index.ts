import { RunGraphProps } from '@/models/RunGraph'
import { startApplication, stopApplication } from '@/objects/application'
import { startCache, stopCache } from '@/objects/cache'
import { startConfig, stopConfig } from '@/objects/config'
import { startCulling, stopCulling } from '@/objects/culling'
import { emitter } from '@/objects/events'
import { startFlowRunArtifacts, stopFlowRunArtifacts } from '@/objects/flowRunArtifacts'
import { startFlowRunEvents, stopFlowRunEvents } from '@/objects/flowRunEvents'
import { startFlowRunStates, stopFlowRunStates } from '@/objects/flowRunStates'
import { startFonts, stopFonts } from '@/objects/fonts'
import { startGuides, stopGuides } from '@/objects/guides'
import { startNodes, stopNodes } from '@/objects/nodes'
import { startPlayhead, stopPlayhead } from '@/objects/playhead'
import { startScale, stopScale } from '@/objects/scale'
import { startScope, stopScope } from '@/objects/scope'
import { startSelection, stopSelection } from '@/objects/selection'
import { startSettings, stopSettings } from '@/objects/settings'
import { startStage, stopStage } from '@/objects/stage'
import { startViewport, stopViewport } from '@/objects/viewport'

export * from './application'
export * from './stage'
export * from './viewport'

type StartParameters = {
  stage: HTMLDivElement,
  props: RunGraphProps,
}

export function start({ stage, props }: StartParameters): void {
  startApplication()
  startViewport()
  startScale()
  startGuides()
  startNodes()
  startFlowRunArtifacts()
  startFlowRunEvents()
  startFlowRunStates()
  startPlayhead()
  startScope()
  startFonts()
  startStage(stage)
  startConfig(props)
  startCulling()
  startSettings()
  startSelection()
  startCache()
}

export function stop(): void {
  emitter.clear()

  try {
    stopApplication()
    stopViewport()
    stopScale()
    stopGuides()
    stopStage()
    stopNodes()
    stopFlowRunArtifacts()
    stopFlowRunEvents()
    stopFlowRunStates()
    stopPlayhead()
    stopConfig()
    stopScope()
    stopFonts()
    stopCulling()
    stopSettings()
    stopSelection()
    stopCache()
  } catch (error) {
    console.error(error)
  }
}