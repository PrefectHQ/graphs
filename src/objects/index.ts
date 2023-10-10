import { RunGraphProps } from '@/models/RunGraph'
import { startApplication, stopApplication } from '@/objects/application'
import { startConfig, stopConfig } from '@/objects/config'
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
  props: RunGraphProps,
}

export function start({ stage, props }: StartParameters): void {
  startApplication()
  startViewport(props)
  startScales()
  startNodes()
  startScope()
  startFonts()
  startStage(stage)
  startConfig(props)
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
  stopFonts()
}