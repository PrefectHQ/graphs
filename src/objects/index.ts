import { createApplication, application } from '@/objects/application'
import { setStage } from '@/objects/stage'
import { createViewport } from '@/objects/viewport'

export * from './application'
export * from './stage'
export * from './viewport'

export function start(stage: HTMLDivElement): void {
  setStage(stage)

  createApplication()
  createViewport()
}

export function stop(): void {
  application.destroy(true, {
    children: true,
  })
}