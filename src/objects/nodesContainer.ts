import { Container } from 'pixi.js'
import { emitter, waitForEvent } from '@/objects/events'
import { waitForViewport } from '@/objects/viewport'

let container: Container | null = null

export async function startNodesContainer(): Promise<void> {
  const viewport = await waitForViewport()
  container = new Container()

  viewport.addChild(container)

  emitter.emit('containerCreated', container)
}

export function stopNodesContainer(): void {
  container = null
}

export async function waitForNodesContainer(): Promise<Container> {
  if (container) {
    return container
  }

  return await waitForEvent('containerCreated')
}