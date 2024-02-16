import { flowRunStatesFactory } from '@/factories/flowRunStates'
import { RunGraphData } from '@/models'
import { waitForApplication } from '@/objects/application'
import { emitter } from '@/objects/events'
import { waitForRunData } from '@/objects/nodes'

export async function startFlowRunStates(): Promise<void> {
  const application = await waitForApplication()
  const data = await waitForRunData()
  const { element, render: renderStates } = await flowRunStatesFactory()

  application.stage.addChild(element)

  function render(newData?: RunGraphData): void {
    renderStates(newData?.state_events)
  }

  if (data.state_events) {
    render(data)
  }

  emitter.on('runDataUpdated', (data) => render(data))
  emitter.on('configUpdated', () => render())
  emitter.on('layoutSettingsUpdated', () => render())
}

export function stopFlowRunStates(): void {
  // do nothing
}