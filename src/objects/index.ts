import { RunGraphConfig } from '@/models/RunGraph'
import { startApplication, stopApplication } from '@/objects/application'
import { startConfig, stopConfig } from '@/objects/config'
import { RunGraphDomain, startDomain, stopDomain } from '@/objects/domain'
import { emitter } from '@/objects/events'
import { startFonts, stopFonts } from '@/objects/fonts'
import { startNodes, stopNodes } from '@/objects/nodes'
import { startScales, stopScales } from '@/objects/scales'
import { startScope, stopScope } from '@/objects/scope'
import { startStage, stopStage } from '@/objects/stage'
import { startViewport, stopViewport } from '@/objects/viewport'

export * from './application'
export * from './stage'
export * from './viewport'
export * from './scales'

type StartParameters = {
  stage: HTMLDivElement,
  config: () => RunGraphConfig,
  domain: () => RunGraphDomain | undefined,
}

export function start({ stage, config, domain }: StartParameters): void {
  startApplication()
  startViewport()
  startScales()
  startNodes()
  startScope()
  startDomain(domain)
  startFonts()
  startStage(stage)
  startConfig(config)
}

export function stop(): void {
  emitter.all.clear()

  stopApplication()
  stopViewport()
  stopScales()
  stopStage()
  stopNodes()
  stopConfig()
  stopScope()
  stopDomain()
  stopFonts()
}