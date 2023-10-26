import { RunGraphProps } from '@/models/RunGraph'
import { startApplication, stopApplication } from '@/objects/application'
import { startConfig, stopConfig } from '@/objects/config'
import { startCulling, stopCulling } from '@/objects/culling'
import { startEdgeCulling, stopEdgeCulling } from '@/objects/edgeCulling'
import { emitter } from '@/objects/events'
import { startFonts, stopFonts } from '@/objects/fonts'
import { startLabelCulling, stopLabelCulling } from '@/objects/labelCulling'
import { startNodes, stopNodes } from '@/objects/nodes'
import { startScale, stopScale } from '@/objects/scale'
import { startScope, stopScope } from '@/objects/scope'
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
  startViewport(props)
  startScale()
  startNodes()
  startScope()
  startFonts()
  startStage(stage)
  startConfig(props)
  startCulling()
  startLabelCulling()
  startEdgeCulling()
}

export function stop(): void {
  emitter.clear()

  stopApplication()
  stopViewport()
  stopScale()
  stopStage()
  stopNodes()
  stopConfig()
  stopScope()
  stopFonts()
  stopCulling()
  stopLabelCulling()
  stopEdgeCulling()
}