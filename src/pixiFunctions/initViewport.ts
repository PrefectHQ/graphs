import { Viewport } from 'pixi-viewport'
import { Application, Ticker } from 'pixi.js'

export function initViewport(stage: HTMLElement, app: Application): Viewport {
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
