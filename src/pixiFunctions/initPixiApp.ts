import { Application } from 'pixi.js'

export function initPixiApp(stage: HTMLElement): Application {
  const pixiApp = new Application({
    backgroundAlpha: 0,
    width: stage.clientWidth,
    height: stage.clientWidth,
    resolution: devicePixelRatio,
    autoDensity: true,
    antialias: true,
  })

  stage.appendChild(pixiApp.view)

  return pixiApp
}
