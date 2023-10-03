import mitt from 'mitt'
import { Viewport } from 'pixi-viewport'
import { Application } from 'pixi.js'
import { Scales } from '@/objects/scales'

type Events = {
  scalesCreated: Scales,
  scalesUpdated: Scales,
  applicationCreated: Application,
  stageCreated: HTMLDivElement,
  stageUpdated: HTMLDivElement,
  viewportCreated: Viewport,
}

export const emitter = mitt<Events>()

export function waitForEvent<T extends keyof Events>(event: T): Promise<Events[T]> {
  let handler: any

  return new Promise<Events[T]>(resolve => {
    handler = resolve
    emitter.on(event, handler)
  }).then(value => {
    emitter.off(event, handler)

    return value
  })
}