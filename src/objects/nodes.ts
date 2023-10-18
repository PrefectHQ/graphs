import { Ticker } from 'pixi.js'
import { NodesContainer, nodesContainerFactory } from '@/factories/nodes'
import { waitForConfig } from '@/objects/config'
import { emitter, waitForEvent } from '@/objects/events'
import { centerViewport, waitForViewport } from '@/objects/viewport'

let nodes: NodesContainer | null = null

export async function startNodes(): Promise<void> {
  const viewport = await waitForViewport()
  const config = await waitForConfig()

  nodes = await nodesContainerFactory(config.runId)

  viewport.addChild(nodes.container)

  nodes.container.alpha = 0

  nodes.events.once('rendered', center)

  emitter.emit('nodesCreated', nodes)
}

export function stopNodes(): void {
  nodes = null
}

export async function waitForNodes(): Promise<NodesContainer> {
  if (nodes) {
    return nodes
  }

  return await waitForEvent('nodesCreated')
}

function center(): void {
  centerViewport()

  Ticker.shared.addOnce(() => {
    if (!nodes) {
      return
    }

    nodes.container.alpha = 1
  })
}