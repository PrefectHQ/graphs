import { Container } from 'pixi.js'
import { DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET } from '@/consts'
import { artifactFactory } from '@/factories/artifact'
import { Artifact } from '@/models'
import { waitForApplication, waitForViewport } from '@/objects'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'

export type FlowRunArtifactFactory = Awaited<ReturnType<typeof flowRunArtifactFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunArtifactFactory(artifact: Artifact) {
  const application = await waitForApplication()
  const viewport = await waitForViewport()

  const { element, render: renderArtifact } = await artifactFactory(artifact)
  let scale = await waitForScale()

  emitter.on('scaleUpdated', updated => scale = updated)

  application.ticker.add(() => {
    updatePosition()
  })

  async function render(): Promise<Container> {
    await renderArtifact()

    return element
  }

  function updatePosition(): void {
    // TODO: Account for different layouts, if non temporal, let the parent handle the position

    const x = scale(artifact.created) * viewport.scale._x + viewport.worldTransform.tx
    element.position.x = x - element.width / 2
    element.position.y = application.screen.height - element.height - DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET
  }

  return {
    element,
    render,
  }
}