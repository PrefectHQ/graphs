import { Container, Ticker } from 'pixi.js'
import { dataFactory } from '@/factories/data'
import { nodesContainerFactory } from '@/factories/nodes'
import { RunGraphData } from '@/models/RunGraph'
import { updateConfig, waitForConfig } from '@/objects/config'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { waitForSettings } from '@/objects/settings'
import { centerViewport, waitForViewport } from '@/objects/viewport'

let stopData: (() => void) | null = null
let runGraphData: RunGraphData | null = null
let nodesContainer: Container | null = null

export async function startNodes(): Promise<void> {
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  const { element, render } = await nodesContainerFactory()

  viewport.addChild(element)

  element.alpha = 0

  const response = await dataFactory(config.runId, async data => {
    const event: EventKey = runGraphData ? 'runDataUpdated' : 'runDataCreated'

    runGraphData = data

    emitter.emit(event, runGraphData)

    // this makes sure the layout settings are initialized prior to rendering
    // important to prevent double rendering on the first render
    await waitForSettings()

    render(data)
  })

  nodesContainer = element
  stopData = response.stop

  nodesContainer.once('rendered', center)

  response.start()
}

export function stopNodes(): void {
  stopData?.()
  stopData = null
  nodesContainer = null
  runGraphData = null
}

export async function waitForRunData(): Promise<RunGraphData> {
  if (runGraphData) {
    return runGraphData
  }

  return await waitForEvent('runDataCreated')
}

function center(): void {
  centerViewport()

  Ticker.shared.addOnce(() => {
    if (!nodesContainer) {
      return
    }

    nodesContainer.alpha = 1
  })
}