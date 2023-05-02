import { Application, utils } from 'pixi.js'

export function initPixiApp(stage: HTMLElement): Application {
  utils.skipHello()

  const pixiApp = new Application({
    backgroundAlpha: 0,
    resolution: window.devicePixelRatio || 2,
    autoDensity: true,
    antialias: true,
    resizeTo: stage,
  })

  if (process.env.NODE_ENV === 'development') {
    initPixiDevTools(pixiApp)
  }

  stage.appendChild(pixiApp.view)

  return pixiApp
}

function initPixiDevTools(app: Application): void {
  // @ts-expect-error - Pixi dev tools are not in the types
  // eslint-disable-next-line no-undef
  globalThis.__PIXI_APP__ = app
}
