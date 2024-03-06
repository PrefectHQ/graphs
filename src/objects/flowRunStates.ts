import { DEFAULT_ROOT_FLOW_STATE_Z_INDEX } from '@/consts'
import { runStatesFactory } from '@/factories/runStates'
import { RunGraphData } from '@/models'
import { waitForApplication } from '@/objects/application'
import { emitter } from '@/objects/events'
import { waitForRunData } from '@/objects/nodes'

export async function startFlowRunStates(): Promise<void> {
  const application = await waitForApplication()
  const data = await waitForRunData()
  const { element, render: renderStates } = await runStatesFactory({ isRoot: true })

  element.zIndex = DEFAULT_ROOT_FLOW_STATE_Z_INDEX
  application.stage.addChild(element)

  function render(newData?: RunGraphData): void {
    renderStates(newData?.states)
  }

  if (data.states) {
    render(data)
  }

  emitter.on('runDataUpdated', (data) => render(data))
  emitter.on('configUpdated', () => render())
  emitter.on('layoutSettingsUpdated', () => render())
}

export function stopFlowRunStates(): void {
  // do nothing
}