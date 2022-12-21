import { Application } from 'pixi.js'

export function initPixiApp(stage: HTMLElement): Application {
  const pixiApp = new Application({
    backgroundAlpha: 0,
    width: stage.clientWidth,
    height: stage.clientHeight,
    resolution: window.devicePixelRatio || 2,
    autoDensity: true,
    antialias: true,
    resizeTo: stage,
  })

  stage.appendChild(pixiApp.view)

  return pixiApp
}
