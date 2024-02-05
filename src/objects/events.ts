import { Cull } from '@pixi-essentials/cull'
import { Viewport } from 'pixi-viewport'
import { Application, Container } from 'pixi.js'
import { EffectScope } from 'vue'
import { eventsFactory } from '@/factories/events'
import { HorizontalScale } from '@/factories/position'
import { LayoutSettings } from '@/models/layout'
import { RequiredGraphConfig, RunGraphData } from '@/models/RunGraph'
import { NodeSelection } from '@/models/selection'
import { ViewportDateRange } from '@/models/viewport'
import { Fonts } from '@/objects/fonts'
import { VisibilityCull } from '@/services/visibilityCull'

type Events = {
  scaleCreated: HorizontalScale,
  scaleUpdated: HorizontalScale,
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
  layoutSettingsUpdated: LayoutSettings,
  layoutSettingsCreated: LayoutSettings,
  cullCreated: Cull,
  labelCullCreated: VisibilityCull,
  iconCullCreated: VisibilityCull,
  edgeCullCreated: VisibilityCull,
  runDataCreated: RunGraphData,
  runDataUpdated: RunGraphData,
  nodeSelected: NodeSelection | null,
  layoutUpdated: void,
  toggleCullCreated: VisibilityCull,
}

export type EventKey = keyof Events

export const emitter = eventsFactory<Events>()

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