import { Container } from 'pixi.js'
import { DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET } from '@/consts'
import { artifactFactory } from '@/factories/artifact'
import { Artifact } from '@/models'
import { waitForApplication, waitForViewport } from '@/objects'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { layout } from '@/objects/settings'

export type FlowRunArtifactFactory = Awaited<ReturnType<typeof flowRunArtifactFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunArtifactFactory(artifact: Artifact) {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  let scale = await waitForScale()

  const { element, render: renderArtifact } = await artifactFactory(artifact, true)

  emitter.on('scaleUpdated', updated => scale = updated)

  application.ticker.add(() => {
    updatePosition()
  })

  async function render(): Promise<Container> {
    await renderArtifact()

    return element
  }

  function updatePosition(): void {
    if (layout.isTemporal()) {
      const x = scale(artifact.created) * viewport.scale._x + viewport.worldTransform.tx
      element.position.x = x - element.width / 2
    }

    element.position.y = application.screen.height - element.height - DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET
  }

  return {
    element,
    data: artifact,
    render,
  }
}