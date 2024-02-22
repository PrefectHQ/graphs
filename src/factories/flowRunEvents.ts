import { Container } from 'pixi.js'
import { DEFAULT_ROOT_EVENT_Z_INDEX } from '@/consts'
import { EventFactory } from '@/factories/event'
import { EventClusterFactory } from '@/factories/eventCluster'
import { flowRunEventFactory } from '@/factories/flowRunEvent'
import { Event } from '@/models'
import { waitForApplication } from '@/objects'
import { emitter } from '@/objects/events'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunEventsFactory() {
  const application = await waitForApplication()

  const events = new Map<string, EventFactory>()
  const clusterNodes: EventClusterFactory[] = []

  let container: Container | null = null
  let internalData: Event[] | null = null

  // TODO: Handle on non temporal layouts

  emitter.on('viewportMoved', () => update())

  async function render(newData?: Event[]): Promise<void> {
    // TODO: Add hide events setting
    // if (container) {
    //   container.visible = !settings.disableEvents
    // }

    // if (settings.disableEvents) {
    //   return
    // }

    if (newData) {
      internalData = newData
    }

    if (!internalData) {
      return
    }

    if (!container) {
      createContainer()
    }

    const promises: Promise<void>[] = []

    for (const artifact of internalData) {
      promises.push(createEvent(artifact))
    }

    await Promise.all(promises)
  }

  function createContainer(): void {
    container = new Container()
    container.zIndex = DEFAULT_ROOT_EVENT_Z_INDEX
    application.stage.addChild(container)
  }

  async function createEvent(event: Event): Promise<void> {
    if (events.has(event.id)) {
      return events.get(event.id)!.render()
    }

    const factory = await flowRunEventFactory({ type: 'event', event })

    events.set(event.id, factory)

    container!.addChild(factory.element)

    return factory.render()
  }

  function update(): void {
    // TODO: Update
  }

  return {
    render,
  }
}