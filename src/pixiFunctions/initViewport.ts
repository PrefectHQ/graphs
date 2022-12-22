import type { Viewport as ViewportType } from 'pixi-viewport'
import { Application } from 'pixi.js'
import { getPixiViewport } from './viewport'

export async function initViewport(stage: HTMLElement, app: Application): Promise<ViewportType> {
  const Viewport = await getPixiViewport()
  const stageWidth = stage.clientWidth
  const stageHeight = stage.clientHeight

  const viewport = new Viewport({
    screenWidth: stageWidth,
    screenHeight: stageHeight,
    passiveWheel: false,
    interaction: app.renderer.plugins.interaction,
    divWheel: stage,
  })

  viewport
    .drag({
      wheel: false,
      pressDrag: true,
    })
    .wheel({
      trackpadPinch: true,
      wheelZoom: false,
    })
    .clampZoom({
      minWidth: stageWidth / 2,
      maxWidth: stageWidth * 20,
    })
    .decelerate({
      friction: 0.9,
    })

  app.stage.addChild(viewport)

  return viewport
}
