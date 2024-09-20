import throttle from 'lodash.throttle'
import { Container } from 'pixi.js'
import { DEFAULT_ROOT_COLLISION_THROTTLE } from '@/consts'
import { eventFactory, EventFactory } from '@/factories/event'
import { EventClusterFactory, eventClusterFactory } from '@/factories/eventCluster'
import { GraphEvent } from '@/models/Graph'
import { emitter } from '@/objects/events'
import { layout, waitForSettings } from '@/objects/settings'
import { clusterHorizontalCollisions } from '@/utilities/detectHorizontalCollisions'

export type GraphEventsFactory = Awaited<GraphEventsFactoryReturn>

export type GraphEventsFactoryReturn = {
  element: Container,
  render: (data?: Map<string, GraphEvent>) => Promise<void>,
  update: () => void,
}

export async function graphEventsFactory(): Promise<GraphEventsFactoryReturn> {
  const settings = await waitForSettings()

  const events = new Map<string, EventFactory>()
  const eventsCreationPromises = new Map<string, Promise<void>>()
  const clusterNodes: EventClusterFactory[] = []
  let availableClusterNodes: EventClusterFactory[] = []

  const container = new Container()
  let internalData: Map<string, GraphEvent> | null = null

  emitter.on('scaleUpdated', () => update())

  async function render(data?: Map<string, GraphEvent>): Promise<void> {
    if (data) {
      internalData = data
    }

    if (!internalData) {
      return
    }

    const promises: Promise<void>[] = []

    for (const [, event] of internalData) {
      promises.push(createEvent(event))
    }

    await Promise.all(promises)

    update()
  }

  async function createEvent(event: GraphEvent): Promise<void> {
    if (events.has(event.id)) {
      return events.get(event.id)!.render()
    }

    if (eventsCreationPromises.has(event.id)) {
      return await eventsCreationPromises.get(event.id)
    }

    const eventCreationPromise = (async () => {
      const factory = await eventFactory(event)
      events.set(event.id, factory)
      container!.addChild(factory.element)
    })()

    eventsCreationPromises.set(event.id, eventCreationPromise)

    await eventCreationPromise

    eventsCreationPromises.delete(event.id)

    return events.get(event.id)!.render()
  }

  function update(): void {
    if (settings.disableEvents || !layout.isTemporal()) {
      return
    }

    checkLayout()
  }

  const checkLayout = throttle(async () => {
    availableClusterNodes = [...clusterNodes]

    await clusterHorizontalCollisions({
      items: events,
      createCluster,
    })

    for (const cluster of availableClusterNodes) {
      cluster.render()
    }
  }, DEFAULT_ROOT_COLLISION_THROTTLE)

  async function createCluster(): Promise<EventClusterFactory> {
    if (availableClusterNodes.length > 0) {
      return availableClusterNodes.pop()!
    }

    const newCluster = await eventClusterFactory()

    container!.addChild(newCluster.element)
    clusterNodes.push(newCluster)

    return newCluster
  }

  return {
    element: container,
    render,
    update,
  }
}