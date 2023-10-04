import { RunGraphConfig } from '@/models/RunGraph'
import { startApplication, stopApplication } from '@/objects/application'
import { startBox, stopBox } from '@/objects/box'
import { startConfig, stopConfig } from '@/objects/config'
import { startDomain, stopDomain } from '@/objects/domain'
import { emitter } from '@/objects/events'
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
}

export function start({ stage, config }: StartParameters): void {
  startApplication()
  startViewport()
  startScales()
  startBox()
  startNodes()
  startScope()
  startDomain()

  startStage(stage)
  startConfig(config)
}

export function stop(): void {
  emitter.all.clear()

  stopApplication()
  stopViewport()
  stopScales()
  stopStage()
  stopBox()
  stopNodes()
  stopConfig()
  stopScope()
  stopDomain()
}