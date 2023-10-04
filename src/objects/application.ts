import { Application } from 'pixi.js'
import { emitter, waitForEvent } from '@/objects/events'
import { waitForStage } from '@/objects/stage'

export let application: Application | null = null

export async function startApplication(): Promise<void> {
  const stage = await waitForStage()

  createApplication(stage)
}

export function stopApplication(): void {
  if (!application) {
    return
  }

  application.destroy(true, {
    children: true,
  })

  application = null
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

export async function waitForApplication(): Promise<Application> {
  if (application) {
    return await application
  }

  return waitForEvent('applicationCreated')
}