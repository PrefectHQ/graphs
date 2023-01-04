import type { Viewport as ViewportType } from 'pixi-viewport'
import { UPDATE_PRIORITY } from 'pixi.js'
import type { Application } from 'pixi.js'
import { getPixiViewport } from './viewport'

export async function initViewport(stage: HTMLElement, appRef: Application): Promise<ViewportType> {
  const Viewport = await getPixiViewport()
  const { width, height } = appRef.screen

  const viewport = new Viewport({
    screenWidth: width,
    screenHeight: height,
    passiveWheel: false,
    interaction: appRef.renderer.plugins.interaction,
    divWheel: stage,
    ticker: appRef.ticker,
  })

  viewport
    .drag({
      wheel: false,
      pressDrag: true,
    })
    .wheel({
      trackpadPinch: true,
      wheelZoom: true,
    })
    .pinch()
    .clampZoom({
      minWidth: width / 2,
      maxWidth: width * 40,
    })
    .decelerate({
      friction: 0.9,
    })

  appRef.stage.addChild(viewport)

  // Resize viewport when screen size changes
  appRef.ticker.add(() => {
    if (viewport.screenWidth !== appRef.screen.width || viewport.screenHeight !== appRef.screen.height) {
      viewport.resize(appRef.screen.width, appRef.screen.height)
    }
  }, null, UPDATE_PRIORITY.LOW)

  return viewport
}
