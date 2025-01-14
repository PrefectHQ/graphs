import { Container, Ticker } from 'pixi.js'
import { dataFactory } from '@/factories/data'
import { nodesContainerFactory } from '@/factories/nodes'
import { RunGraphData } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
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

  emitter.on('configUpdated', () => {
    if (!runGraphData) {
      return
    }

    render(runGraphData)
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
  runGraphData = null
}

export async function waitForRunData(): Promise<RunGraphData> {
  if (runGraphData) {
    return runGraphData
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