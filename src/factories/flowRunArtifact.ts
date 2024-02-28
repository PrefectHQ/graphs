import { DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET } from '@/consts'
import { ArtifactFactory, artifactFactory } from '@/factories/artifact'
import { ArtifactClusterFactory, ArtifactClusterFactoryRenderProps, artifactClusterFactory } from '@/factories/artifactCluster'
import { RunGraphArtifact } from '@/models'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { layout, waitForSettings } from '@/objects/settings'

export type FlowRunArtifactFactory = Awaited<ReturnType<typeof flowRunArtifactFactory>>

type ArtifactFactoryOptions = { type: 'artifact', artifact: RunGraphArtifact } | { type: 'cluster' }

type FactoryType<T> = T extends { type: 'artifact' }
  ? ArtifactFactory
  : T extends { type: 'cluster' }
    ? ArtifactClusterFactory
    : never

type RenderPropsType<T> = T extends { type: 'cluster' }
  ? ArtifactClusterFactoryRenderProps
  : undefined

export async function flowRunArtifactFactory<T extends ArtifactFactoryOptions>(options: T): Promise<FactoryType<T>> {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  const settings = await waitForSettings()
  let scale = await waitForScale()

  const factory = await getFactory() as FactoryType<T>

  emitter.on('scaleUpdated', updated => {
    scale = updated
    updatePosition()
  })
  emitter.on('viewportMoved', () => updatePosition())

  async function render(props?: RenderPropsType<T>): Promise<void> {
    await factory.render(props)
    updatePosition()
  }

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

  return {
    ...factory,
    render,
  }
}