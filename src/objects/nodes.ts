import { Ticker } from 'pixi.js'
import { nodesContainerFactory } from '@/factories/nodes'
import { waitForConfig } from '@/objects/config'
import { waitForEvent } from '@/objects/events'
import { centerViewport, waitForViewport } from '@/objects/viewport'
import { NodesContainerService } from '@/services/nodesContainerService'

let service: NodesContainerService | null = null

export async function startNodes(): Promise<void> {
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  const { container } = await nodesContainerFactory(config.runId)

  viewport.addChild(container)

  // container.alpha = 0

  // service.emitter.on('rendered', center)
}

export function stopNodes(): void {
  service = null
}

export async function waitForNodes(): Promise<NodesContainerService> {
  if (service) {
    return service
  }

  return await waitForEvent('nodesCreated')
}

async function center(): Promise<void> {
  const service = await waitForNodes()

  centerViewport()

  Ticker.shared.addOnce(() => {
    service.container.alpha = 1
  })

  service.emitter.off('rendered', center)
}