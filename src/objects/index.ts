import { GraphProps } from '@/models/Graph'
import { startApplication, stopApplication } from '@/objects/application'
import { startCache, stopCache } from '@/objects/cache'
import { startConfig, stopConfig } from '@/objects/config'
import { startCulling, stopCulling } from '@/objects/culling'
import { emitter } from '@/objects/events'
import { startFonts, stopFonts } from '@/objects/fonts'
import { startGraphEvents } from '@/objects/graphEvents'
import { startGraphNodes, stopGraphNodes } from '@/objects/graphNodes'
import { startGuides, stopGuides } from '@/objects/guides'
import { startPlayhead, stopPlayhead } from '@/objects/playhead'
import { startScale, stopScale } from '@/objects/scale'
import { startScope, stopScope } from '@/objects/scope'
import { startSettings, stopSettings } from '@/objects/settings'
import { startStage, stopStage } from '@/objects/stage'
import { startViewport, stopViewport } from '@/objects/viewport'

export * from './application'
export * from './stage'
export * from './viewport'

type StartParameters = {
  stage: HTMLDivElement,
  props: GraphProps,
}

export function start({ stage, props }: StartParameters): void {
  console.log('starting')
  startStage(stage)
  startApplication()
  startViewport()
  startScale(props.data)
  startGuides()
  startGraphNodes(props.data)
  startGraphEvents()
  startPlayhead(props.data) // requires data nodes
  startScope()
  startFonts() // TODO: applications should be able to provide their own fonts, even as part of callbacks
  startConfig(props)
  startCulling()
  startSettings(props.data) // data dependent
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
    stopGraphNodes()
    // stopGraphEvents() // not needed?
    stopPlayhead()
    stopConfig()
    stopScope()
    stopFonts()
    stopCulling()
    stopSettings()
    stopCache()
  } catch (error) {
    console.error(error)
  }
}