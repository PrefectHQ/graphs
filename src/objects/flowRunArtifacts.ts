import { DEFAULT_ROOT_ARTIFACT_Z_INDEX } from '@/consts'
import { runArtifactsFactory } from '@/factories/runArtifacts'
import { RunGraphData } from '@/models/RunGraph'
import { waitForApplication } from '@/objects/application'
import { emitter } from '@/objects/events'
import { waitForRunData } from '@/objects/nodes'

export async function startFlowRunArtifacts(): Promise<void> {
  const application = await waitForApplication()
  const data = await waitForRunData()
  const { element, render: renderArtifacts, update } = await runArtifactsFactory({ isRoot: true })

  element.zIndex = DEFAULT_ROOT_ARTIFACT_Z_INDEX
  application.stage.addChild(element)

  function render(newData?: RunGraphData): void {
    renderArtifacts(newData?.artifacts)
  }

  if (data.artifacts) {
    render(data)
  }

  emitter.on('viewportMoved', () => update())

  emitter.on('runDataCreated', (data) => render(data))
  emitter.on('runDataUpdated', (data) => render(data))
  emitter.on('configUpdated', () => render())
}

export function stopFlowRunArtifacts(): void {
  // do nothing
}