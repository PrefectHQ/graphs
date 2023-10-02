import { Application } from 'pixi.js'
import { emitter } from '@/objects/events'

export let application: Application | null = null

export function startApplication(): void {
  emitter.on('stageCreated', createApplication)
}

export function stopApplication(): void {
  if (!application) {
    return
  }

  application.destroy(true, {
    children: true,
  })
}

function createApplication(stage: HTMLDivElement): void {
  application = new Application({
    background: '#1099bb',
    resizeTo: stage,
  })

  stage.appendChild(application.view as HTMLCanvasElement)

  emitter.emit('applicationCreated', application)

  if (process.env.NODE_ENV === 'development') {
    // For whatever reason typing globalThis is not quite working and not worth the time to fix for devtools
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__PIXI_APP__ = application
  }
}