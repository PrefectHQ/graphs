import { Container } from 'pixi.js'
import { DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET } from '@/consts'
import { artifactFactory } from '@/factories/artifact'
import { Artifact } from '@/models'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { isSelected } from '@/objects/selection'
import { layout } from '@/objects/settings'

export type FlowRunArtifactFactory = Awaited<ReturnType<typeof flowRunArtifactFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunArtifactFactory(artifact: Artifact) {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  let scale = await waitForScale()

  const { element, render: renderArtifact } = await artifactFactory(artifact, { cullAtZoomThreshold: false })

  let isArtifactSelected = false

  emitter.on('scaleUpdated', updated => scale = updated)
  emitter.on('viewportMoved', () => updatePosition())
  emitter.on('itemSelected', () => {
    const isCurrentlySelected = isSelected(artifact)

    if (isCurrentlySelected !== isArtifactSelected) {
      isArtifactSelected = isCurrentlySelected
      render()
    }
  })

  async function render(): Promise<Container> {
    await renderArtifact()

    return element
  }

  function updatePosition(): void {
    if (!layout.isTemporal()) {
      return
    }

    let selectedOffset = 0

    if (isArtifactSelected) {
      const { selectedBorderOffset, selectedBorderWidth } = config.styles
      selectedOffset = selectedBorderOffset + selectedBorderWidth * 2
    }

    const x = scale(artifact.created) * viewport.scale._x + viewport.worldTransform.tx
    const centeredX = x - (element.width - selectedOffset) / 2
    const y = application.screen.height - (element.height - selectedOffset) - DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET

    element.position.set(centeredX, y)
  }

  return {
    element,
    data: artifact,
    render,
  }
}