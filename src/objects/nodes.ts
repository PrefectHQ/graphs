import { Container, Ticker } from 'pixi.js'
import { dataFactory } from '@/factories/data'
import { nodesContainerFactory } from '@/factories/nodes'
import { DataBundle, RunGraphData } from '@/models'
import { waitForConfig } from '@/objects/config'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { waitForSettings } from '@/objects/settings'
import { centerViewport, waitForViewport } from '@/objects/viewport'

let stopData: (() => void) | null = null
let dataBundle: DataBundle | null = null
let nodesContainer: Container | null = null

export async function startNodes(): Promise<void> {
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  const { element, render } = await nodesContainerFactory()

  viewport.addChild(element)

  element.alpha = 0

  const response = await dataFactory(config.runId, async (data) => {
    const event: EventKey = dataBundle?.data ? 'runDataUpdated' : 'runDataCreated'

    dataBundle = data

    emitter.emit(event, dataBundle.data)

    // this makes sure the layout settings are initialized prior to rendering
    // important to prevent double rendering on the first render
    await waitForSettings()

    render(data)
  })

  emitter.on('configUpdated', () => {
    if (!dataBundle) {
      return
    }

    render(dataBundle)
  })

  nodesContainer = element
  stopData = response.stop

  nodesContainer.once('rendered', () => centerAfterFirstRender())

  emitter.on('layoutUpdated', () => centerAfterRender())

  response.start()
}

export function stopNodes(): void {
  stopData?.()
  stopData = null
  nodesContainer = null
  dataBundle = null
}

export async function waitForRunData(): Promise<RunGraphData> {
  if (dataBundle?.data) {
    return dataBundle.data
  }

  return await waitForEvent('runDataCreated')
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