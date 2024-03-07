import { DEFAULT_ROOT_EVENT_Z_INDEX } from '@/consts'
import { eventDataFactory } from '@/factories/eventData'
import { runEventsFactory } from '@/factories/runEvents'
import { RunGraphEvent } from '@/models'
import { waitForApplication } from '@/objects/application'
import { waitForConfig } from '@/objects/config'
import { EventKey, emitter } from '@/objects/events'
import { waitForSettings } from '@/objects/settings'

let stopEventData: (() => void) | null = null
let rootGraphEvents: RunGraphEvent[] | null = null

export async function startFlowRunEvents(): Promise<void> {
  const application = await waitForApplication()
  const config = await waitForConfig()

  const { element, render, update } = await runEventsFactory({ isRoot: true })

  element.zIndex = DEFAULT_ROOT_EVENT_Z_INDEX
  application.stage.addChild(element)

  const response = await eventDataFactory(config.runId, async data => {
    const event: EventKey = rootGraphEvents ? 'eventDataUpdated' : 'eventDataCreated'

    rootGraphEvents = data

    emitter.emit(event, rootGraphEvents)

    // this makes sure the layout settings are initialized prior to rendering
    // important to prevent double rendering on the first render
    await waitForSettings()

    render(data)
  })

  emitter.on('configUpdated', () => render())
  emitter.on('viewportMoved', () => update())
  emitter.on('scaleUpdated', () => update())

  stopEventData = response.stop

  response.start()
}

export function stopFlowRunEvents(): void {
  stopEventData?.()
  stopEventData = null
  rootGraphEvents = null
}