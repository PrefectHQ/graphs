import { Application } from 'pixi.js'
import { stage } from '@/objects/stage'

export let application: Application

export function createApplication(): void {
  application = new Application({
    background: '#1099bb',
    resizeTo: stage,
  })

  stage.appendChild(application.view as HTMLCanvasElement)

  if (process.env.NODE_ENV === 'development') {
    // For whatever reason typing globalThis is not quite working and not worth the time to fix for devtools
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__PIXI_APP__ = application
  }
}