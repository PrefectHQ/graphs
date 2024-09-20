import { DEFAULT_ROOT_EVENT_Z_INDEX } from '@/consts'
import { graphEventsFactory } from '@/factories/graphEvents'
import { GraphData, GraphEvent } from '@/models/Graph'
import { waitForApplication } from '@/objects/application'
import { emitter } from '@/objects/events'
import { layout, waitForSettings } from '@/objects/settings'

export async function startGraphEvents(): Promise<void> {
  const application = await waitForApplication()
  const settings = await waitForSettings()

  const { element, render: renderEvents, update } = await graphEventsFactory()

  element.zIndex = DEFAULT_ROOT_EVENT_Z_INDEX

  async function render(data?: Map<string, GraphEvent>): Promise<void> {
    if (!layout.isTemporal() || settings.disableEvents) {
      application.stage.removeChild(element)
      return
    }

    application.stage.addChild(element)

    await renderEvents(data)
  }

  emitter.on('graphDataUpdated', async (data: GraphData) => {
    await waitForSettings()
    render(data.events)
  })

  emitter.on('configUpdated', () => render())
  emitter.on('viewportMoved', () => update())
  emitter.on('layoutSettingsUpdated', () => render())
}