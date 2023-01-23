import { Application, UPDATE_PRIORITY, utils } from 'pixi.js'

export function initPixiApp(stage: HTMLElement): Application {
  // Skip the Pixi console message
  utils.skipHello()

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

  pixiApp.ticker.add(() => {
    if (stage.clientWidth !== pixiApp.screen.width || stage.clientHeight !== pixiApp.screen.height) {
      pixiApp.resizeTo = stage
    }
  }, null, UPDATE_PRIORITY.LOW)

  return pixiApp
}
