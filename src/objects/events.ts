import mitt from 'mitt'
import { Viewport } from 'pixi-viewport'
import { Application } from 'pixi.js'
import { ScaleX, ScaleY } from '@/objects/scales'

type Events = {
  scaleXUpdated: ScaleX,
  scaleYUpdated: ScaleY,
  applicationCreated: Application,
  stageCreated: HTMLDivElement,
  stageResized: HTMLDivElement,
  viewportCreated: Viewport,
}

export const emitter = mitt<Events>()