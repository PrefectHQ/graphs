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

emitter.on('applicationCreated', () => console.log('applicationCreated'))
emitter.on('stageCreated', () => console.log('stageCreated'))
emitter.on('stageUpdated', () => console.log('stageUpdated'))
emitter.on('viewportCreated', () => console.log('viewportCreated'))
emitter.on('scaleCreated', () => console.log('scaleCreated'))
emitter.on('scopeCreated', () => console.log('scopeCreated'))
emitter.on('fontsLoaded', () => console.log('fontsLoaded'))
emitter.on('containerCreated', () => console.log('containerCreated'))
emitter.on('layoutSettingsUpdated', () => console.log('layoutSettingsUpdated'))
emitter.on('cullCreated', () => console.log('cullCreated'))
emitter.on('graphDataUpdated', (data) => console.log('graphDataUpdated', data))
emitter.on('layoutUpdated', () => console.log('layoutUpdated'))
emitter.on('toggleCullCreated', () => console.log('toggleCullCreated'))
emitter.on('configCreated', () => console.log('configCreated'))
emitter.on('configUpdated', () => console.log('configUpdated'))
emitter.on('viewportDateRangeUpdated', () => console.log('viewportDateRangeUpdated'))
emitter.on('labelCullCreated', () => console.log('labelCullCreated'))
emitter.on('iconCullCreated', () => console.log('iconCullCreated'))
emitter.on('edgeCullCreated', () => console.log('edgeCullCreated'))
emitter.on('applicationResized', () => console.log('applicationResized'))
emitter.on('scaleUpdated', () => console.log('scaleUpdated'))
emitter.on('viewportMoved', () => console.log('viewportMoved'))
emitter.on('layoutSettingsCreated', () => console.log('layoutSettingsCreated'))


export function start({ stage, props }: StartParameters): void {
  console.log('starting')
  startConfig(props)
  startSettings(props.data) // data dependent
  startScope()
  startFonts()
  startStage(stage)
  startApplication()
  startViewport()
  startScale(props.data)
  startGuides()
  // startGraphNodes(props.data)
  // startGraphEvents()
  // startPlayhead(props.data) // requires data nodes

  // TODO: applications should be able to provide their own fonts, even as part of callbacks
  // startCulling()

  // startCache()
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