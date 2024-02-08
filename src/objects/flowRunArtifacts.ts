import { flowRunArtifactsFactory } from '@/factories/flowRunArtifacts'
import { RunGraphData } from '@/models/RunGraph'
import { emitter } from '@/objects/events'

export async function startFlowRunArtifacts(): Promise<void> {
  const { render: renderArtifacts } = await flowRunArtifactsFactory()

  function render(newData?: RunGraphData): void {
    renderArtifacts(newData?.artifacts)
  }

  emitter.on('runDataCreated', (data) => render(data))
  emitter.on('runDataUpdated', (data) => render(data))
  emitter.on('configUpdated', () => render())
  emitter.on('layoutSettingsUpdated', () => render())
}

export function stopFlowRunArtifacts(): void {
  // do nothing
}