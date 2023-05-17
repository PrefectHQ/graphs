import { Application, UPDATE_PRIORITY, utils } from 'pixi.js'

export function initPixiApp(stage: HTMLElement): Application {
  utils.skipHello()

  const pixiApp = new Application({
    backgroundAlpha: 0,
    resolution: window.devicePixelRatio || 2,
    autoDensity: true,
    antialias: true,
  })

  if (process.env.NODE_ENV === 'development') {
    initPixiDevTools(pixiApp)
  }

  stage.appendChild(pixiApp.view)

  pixiApp.ticker.add(() => {
    if (stage.clientWidth !== pixiApp.screen.width || stage.clientHeight !== pixiApp.screen.height) {
      pixiApp.resizeTo = stage
    }
  }, null, UPDATE_PRIORITY.LOW)

  return pixiApp
}

function initPixiDevTools(app: Application): void {
  // @ts-expect-error - Pixi dev tools are not in the types
  // eslint-disable-next-line no-undef
  globalThis.__PIXI_APP__ = app
}
