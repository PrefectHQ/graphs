import { eventDataFactory } from '@/factories/eventData'
import { flowRunEventsFactory } from '@/factories/flowRunEvents'
import { RunGraphEvent } from '@/models'
import { waitForConfig } from '@/objects/config'
import { EventKey, emitter } from '@/objects/events'
import { waitForSettings } from '@/objects/settings'

let stopEventData: (() => void) | null = null
let rootGraphEvents: RunGraphEvent[] | null = null

export async function startFlowRunEvents(): Promise<void> {
  const config = await waitForConfig()

  const { render } = await flowRunEventsFactory()

  const response = await eventDataFactory(config.runId, async data => {
    const event: EventKey = rootGraphEvents ? 'eventDataUpdated' : 'eventDataCreated'

    rootGraphEvents = data

    emitter.emit(event, rootGraphEvents)

    // this makes sure the layout settings are initialized prior to rendering
    // important to prevent double rendering on the first render
    await waitForSettings()

    render(data)
  })

  emitter.on('configUpdated', () => {
    if (!rootGraphEvents) {
      return
    }

    render()
  })

  stopEventData = response.stop

  response.start()
}

export function stopFlowRunEvents(): void {
  stopEventData?.()
  stopEventData = null
  rootGraphEvents = null
}