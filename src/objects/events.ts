import mitt from 'mitt'
import { Viewport } from 'pixi-viewport'
import { Application, Container } from 'pixi.js'
import { EffectScope } from 'vue'
import { LayoutMode } from '@/models/layout'
import { RequiredGraphConfig } from '@/models/RunGraph'
import { ViewportDateRange } from '@/models/viewport'
import { Fonts } from '@/objects/fonts'
import { NodePositionService } from '@/services/nodePositionService'

type Events = {
  scalesCreated: NodePositionService,
  scalesUpdated: NodePositionService,
  applicationCreated: Application,
  applicationResized: Application,
  stageCreated: HTMLDivElement,
  stageUpdated: HTMLDivElement,
  viewportCreated: Viewport,
  viewportDateRangeUpdated: ViewportDateRange,
  configCreated: RequiredGraphConfig,
  configUpdated: RequiredGraphConfig,
  scopeCreated: EffectScope,
  fontsLoaded: Fonts,
  containerCreated: Container,
  layoutUpdated: LayoutMode,
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