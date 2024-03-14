import { DEFAULT_ROOT_EVENT_Z_INDEX } from '@/consts'
import { eventDataFactory } from '@/factories/eventData'
import { runEventsFactory } from '@/factories/runEvents'
import { RunGraphEvent } from '@/models'
import { waitForApplication } from '@/objects/application'
import { waitForConfig } from '@/objects/config'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { layout, waitForSettings } from '@/objects/settings'

let stopEventData: (() => void) | null = null
let rootGraphEvents: RunGraphEvent[] | null = null

export async function startFlowRunEvents(): Promise<void> {
  const application = await waitForApplication()
  const config = await waitForConfig()
  const settings = await waitForSettings()

  const { element, render: renderEvents, update } = await runEventsFactory({ isRoot: true })

  element.zIndex = DEFAULT_ROOT_EVENT_Z_INDEX

  async function render(data?: RunGraphEvent[]): Promise<void> {
    if (!layout.isTemporal() || settings.disableEvents) {
      application.stage.removeChild(element)
      return
    }

    application.stage.addChild(element)

    await renderEvents(data)
  }

  const response = await eventDataFactory(config.runId, data => {
    const event: EventKey = rootGraphEvents ? 'eventDataUpdated' : 'eventDataCreated'

    rootGraphEvents = data

    emitter.emit(event, rootGraphEvents)

    render(data)
  })

  emitter.on('configUpdated', () => render())
  emitter.on('viewportMoved', () => update())
  emitter.on('layoutSettingsUpdated', () => render())

  stopEventData = response.stop

  response.start()
}

export function stopFlowRunEvents(): void {
  stopEventData?.()
  stopEventData = null
  rootGraphEvents = null
}

export async function waitForRunEvents(): Promise<RunGraphEvent[] | null> {
  if (rootGraphEvents) {
    return rootGraphEvents
  }

  return await waitForEvent('eventDataCreated')
}