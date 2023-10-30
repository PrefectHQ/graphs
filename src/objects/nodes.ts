import { Ticker } from 'pixi.js'
import { NodesContainer, nodesContainerFactory } from '@/factories/nodes'
import { RunGraphData } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { centerViewport, waitForViewport } from '@/objects/viewport'

let nodes: NodesContainer | null = null
let data: RunGraphData | null = null

export async function startNodes(): Promise<void> {
  const viewport = await waitForViewport()
  const config = await waitForConfig()

  nodes = await nodesContainerFactory(config.runId)

  viewport.addChild(nodes.element)

  nodes.element.alpha = 0

  nodes.render()

  nodes.element.once('rendered', center)
  nodes.element.on('fetched', onFetched)
}

export function stopNodes(): void {
  nodes?.stop()
  nodes = null
  data = null
}

export async function waitForRunData(): Promise<RunGraphData> {
  if (data) {
    return data
  }

  return await waitForEvent('runDataCreated')
}

function onFetched(value: RunGraphData): void {
  const event: EventKey = data ? 'runDataUpdated' : 'runDataCreated'

  data = value

  emitter.emit(event, data)
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