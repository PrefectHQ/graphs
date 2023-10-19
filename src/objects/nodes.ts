import { Ticker } from 'pixi.js'
import { NodesContainer, nodesContainerFactory } from '@/factories/nodes'
import { waitForConfig } from '@/objects/config'
import { centerViewport, waitForViewport } from '@/objects/viewport'

let nodes: NodesContainer | null = null

export async function startNodes(): Promise<void> {
  const viewport = await waitForViewport()
  const config = await waitForConfig()

  nodes = await nodesContainerFactory(config.runId)

  viewport.addChild(nodes.container)

  nodes.container.alpha = 0

  nodes.render()

  nodes.container.once('rendered', center)
}

export function stopNodes(): void {
  nodes = null
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