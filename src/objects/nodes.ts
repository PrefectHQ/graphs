import { Ticker } from 'pixi.js'
import { NodesContainer, nodesContainerFactory } from '@/factories/nodes'
import { waitForConfig } from '@/objects/config'
import { centerViewport, waitForViewport } from '@/objects/viewport'

let nodes: NodesContainer | null = null

export async function startNodes(): Promise<void> {
  const viewport = await waitForViewport()
  const config = await waitForConfig()

  nodes = await nodesContainerFactory(config.runId)

  viewport.addChild(nodes.element)

  nodes.element.alpha = 0

  nodes.render()

  nodes.element.once('rendered', center)
}

export function stopNodes(): void {
  nodes?.stop()
  nodes = null
}

function center(): void {
  centerViewport()

  Ticker.shared.addOnce(() => {
    if (!nodes) {
      return
    }

    nodes.element.alpha = 1
  })
}