import { startApplication, stopApplication } from '@/objects/application'
import { startBox, stopBox } from '@/objects/box'
import { emitter } from '@/objects/events'
import { startScales, stopScales } from '@/objects/scales'
import { startStage, stopStage } from '@/objects/stage'
import { startViewport, stopViewport } from '@/objects/viewport'

export * from './application'
export * from './stage'
export * from './viewport'
export * from './scales'

export function start(stage: HTMLDivElement): void {
  startApplication()
  startViewport()
  startScales()
  startBox()

  startStage(stage)
}

export function stop(): void {
  emitter.all.clear()

  stopApplication()
  stopViewport()
  stopScales()
  stopStage()
  stopBox()
}