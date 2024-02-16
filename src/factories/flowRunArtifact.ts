import { DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET } from '@/consts'
import { ArtifactFactory, artifactFactory } from '@/factories/artifact'
import { ArtifactClusterFactory, artifactClusterFactory } from '@/factories/artifactCluster'
import { Artifact } from '@/models'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { layout, waitForSettings } from '@/objects/settings'

export type FlowRunArtifactFactory = Awaited<ReturnType<typeof flowRunArtifactFactory>>

type ArtifactFactoryOptions = { type: 'artifact', artifact: Artifact } | { type: 'cluster' }

export async function flowRunArtifactFactory(options: ArtifactFactoryOptions): Promise<ArtifactFactory | ArtifactClusterFactory> {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  const settings = await waitForSettings()
  let scale = await waitForScale()

  const factory = await getFactory()

  emitter.on('scaleUpdated', updated => {
    scale = updated
    updatePosition()
  })
  emitter.on('viewportMoved', () => updatePosition())
  emitter.on('itemSelected', () => {
    factory.render()
  })

  async function getFactory(): Promise<ArtifactFactory | ArtifactClusterFactory> {
    if (options.type === 'artifact') {
      return await artifactFactory(options.artifact, { cullAtZoomThreshold: false })
    }

    return await artifactClusterFactory()
  }

  function updatePosition(): void {
    const date = factory.getDate()

    if (!date || !layout.isTemporal() || settings.disableArtifacts) {
      return
    }

    const selected = factory.getSelected()
    const { element } = factory

    let selectedOffset = 0

    if (selected) {
      const { selectedBorderOffset, selectedBorderWidth } = config.styles
      selectedOffset = selectedBorderOffset + selectedBorderWidth * 2
    }

    const x = scale(date) * viewport.scale._x + viewport.worldTransform.tx
    const centeredX = x - (element.width - selectedOffset) / 2
    const y = application.screen.height - (element.height - selectedOffset) - DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET

    element.position.set(centeredX, y)
  }

  return factory
}