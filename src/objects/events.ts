import mitt from 'mitt'
import { Viewport } from 'pixi-viewport'
import { Application } from 'pixi.js'
import { EffectScope } from 'vue'
import { RequiredGraphConfig } from '@/models/RunGraph'
import { Fonts } from '@/objects/fonts'
import { ScaleXDomain, Scales } from '@/objects/scales'

type Events = {
  scalesCreated: Scales,
  scalesUpdated: Scales,
  applicationCreated: Application,
  stageCreated: HTMLDivElement,
  stageUpdated: HTMLDivElement,
  viewportCreated: Viewport,
  viewportDateRangeUpdated: ScaleXDomain,
  configCreated: RequiredGraphConfig,
  configUpdated: RequiredGraphConfig,
  scopeCreated: EffectScope,
  fontsLoaded: Fonts,
}

export type EventKey = keyof Events

export const emitter = mitt<Events>()

export function waitForEvent<T extends EventKey>(event: T): Promise<Events[T]> {
  // making ts happy with this is just not worth it IMO since this is
  // only necessary for the emitter.off
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: any

  return new Promise<Events[T]>(resolve => {
    handler = resolve
    emitter.on(event, handler)
  }).then(value => {
    emitter.off(event, handler)

    return value
  })
}