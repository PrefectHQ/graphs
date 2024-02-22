import { DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET } from '@/consts'
import { EventFactory, eventFactory } from '@/factories/event'
import { EventClusterFactory, EventClusterFactoryRenderProps, eventClusterFactory } from '@/factories/eventCluster'
import { Event } from '@/models'
import { waitForApplication, waitForViewport } from '@/objects'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { layout } from '@/objects/settings'

export type FlowRunEventFactory = Awaited<ReturnType<typeof flowRunEventFactory>>

type EventFactoryOptions = { type: 'event', event: Event } | { type: 'cluster' }

type EventFactoryType<T> = T extends { type: 'event' }
  ? EventFactory
  : T extends { type: 'cluster' }
    ? EventClusterFactory
    : never

type RenderPropsType<T> = T extends { type: 'cluster' }
  ? EventClusterFactoryRenderProps
  : undefined

export async function flowRunEventFactory<T extends EventFactoryOptions>(options: T): Promise<EventFactoryType<T>> {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  let scale = await waitForScale()

  const factory = await getFactory() as EventFactoryType<T>

  emitter.on('scaleUpdated', updated => {
    scale = updated
    updatePosition()
  })
  emitter.on('viewportMoved', () => updatePosition())

  async function render(props?: RenderPropsType<T>): Promise<void> {
    await factory.render(props)
    updatePosition()
  }

  async function getFactory(): Promise<EventFactory | EventClusterFactory> {
    if (options.type === 'event') {
      return await eventFactory(options.event)
    }

    return await eventClusterFactory()
  }

  function updatePosition(): void {
    const date = factory.getDate()

    // TODO: || settings.disableEvents
    if (!date || !layout.isTemporal()) {
      return
    }

    const { element } = factory

    const selectedOffset = 0

    const x = scale(date) * viewport.scale._x + viewport.worldTransform.tx
    const centeredX = x - (element.width - selectedOffset) / 2
    const y = application.screen.height - (element.height - selectedOffset) - DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET

    element.position.set(centeredX, y)
  }

  return {
    ...factory,
    render,
  }
}