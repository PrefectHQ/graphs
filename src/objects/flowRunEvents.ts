import { flowRunEventsFactory } from '@/factories/flowRunEvents'
import { RunGraphData } from '@/models/RunGraph'
import { emitter } from '@/objects/events'
import { waitForRunData } from '@/objects/nodes'

export async function startFlowRunEvents(): Promise<void> {
  const data = await waitForRunData()
  const { render: renderEvents } = await flowRunEventsFactory()

  function render(newData?: RunGraphData): void {
    renderEvents(newData?.events)
  }

  if (data.artifacts) {
    render(data)
  }

  emitter.on('runDataCreated', (data) => render(data))
  emitter.on('runDataUpdated', (data) => render(data))
  emitter.on('configUpdated', () => render())
  emitter.on('layoutSettingsUpdated', () => render())
}

export function stopFlowRunEvents(): void {
  // do nothing
}