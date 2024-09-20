import { Container, Ticker } from 'pixi.js'
import { nodesContainerFactory } from '@/factories/nodes'
import { GraphData } from '@/models/Graph'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForSettings } from '@/objects/settings'
import { centerViewport, waitForViewport } from '@/objects/viewport'

let nodesContainer: Container | null = null

export async function startGraphNodes(): Promise<void> {
  const viewport = await waitForViewport()
  const { element, render } = await nodesContainerFactory()

  viewport.addChild(element)

  element.alpha = 0


  emitter.on('graphDataUpdated', async (data: GraphData) => {
    await waitForSettings()
    render(data)
  })

  nodesContainer = element
  nodesContainer.once('rendered', () => centerAfterFirstRender())

  emitter.on('layoutUpdated', () => centerAfterRender())
}

export function stopGraphNodes(): void {
  nodesContainer = null
}

function centerAfterFirstRender(): void {
  centerViewport()

  Ticker.shared.addOnce(() => {
    if (!nodesContainer) {
      return
    }

    nodesContainer.alpha = 1
  })
}

async function centerAfterRender(): Promise<void> {
  if (!nodesContainer) {
    return
  }

  const config = await waitForConfig()

  nodesContainer.once('rendered', () => {
    setTimeout(() => {
      centerViewport({ animate: true })
    }, config.animationDuration)
  })
}