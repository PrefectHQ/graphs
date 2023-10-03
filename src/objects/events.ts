import mitt from 'mitt'
import { Viewport } from 'pixi-viewport'
import { Application } from 'pixi.js'
import { ScaleX, ScaleY } from '@/objects/scales'

type Events = {
  scaleUpdated: { scaleX: ScaleX, scaleY: ScaleY },
  applicationCreated: Application,
  stageUpdated: HTMLDivElement,
  stageCreated: HTMLDivElement,
  viewportCreated: Viewport,
}

export const emitter = mitt<Events>()