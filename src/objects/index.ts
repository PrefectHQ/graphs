import { createApplication, application } from '@/objects/application'
import { createBox } from '@/objects/box'
import { createScales } from '@/objects/scales'
import { setStage } from '@/objects/stage'
import { createViewport } from '@/objects/viewport'

export * from './application'
export * from './stage'
export * from './viewport'
export * from './scales'

export function start(stage: HTMLDivElement): void {
  setStage(stage)

  createApplication()
  createViewport()
  createScales()
  createBox()
}

export function stop(): void {
  application.destroy(true, {
    children: true,
  })
}