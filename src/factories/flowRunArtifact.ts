import { Container } from 'pixi.js'
import { DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET } from '@/consts'
import { ArtifactFactory, artifactFactory } from '@/factories/artifact'
import { ArtifactClusterFactory, ArtifactClusterFactoryRenderProps, artifactClusterFactory } from '@/factories/artifactCluster'
import { Artifact } from '@/models'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { isSelected } from '@/objects/selection'
import { layout } from '@/objects/settings'

export type FlowRunArtifactFactory = Awaited<ReturnType<typeof flowRunArtifactFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunArtifactFactory(artifact?: Artifact) {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  let scale = await waitForScale()

  const { element, render: renderArtifact } = await getFactory()

  let date: Date | null = artifact ? artifact.created : null
  const isCluster = !artifact
  let ids: string[] = artifact ? [artifact.id] : []
  let selected = false

  emitter.on('scaleUpdated', updated => {
    scale = updated
    updatePosition()
  })
  emitter.on('viewportMoved', () => updatePosition())
  emitter.on('itemSelected', () => {
    const isCurrentlySelected = isSelected(
      artifact
        ? { kind: 'artifact', id: ids[0] }
        : { kind: 'artifacts', ids },
    )

    if (isCurrentlySelected === selected) {
      return
    }

    selected = isCurrentlySelected
    const options = isCluster && date ? { date, ids } : undefined

    render(options)
  })

  async function render(clusterOptions?: ArtifactClusterFactoryRenderProps): Promise<Container> {
    if (clusterOptions) {
      const { date: newDate, ids: newIds } = clusterOptions
      date = newDate
      ids = newIds
    }

    if (!date) {
      return element
    }

    await renderArtifact(clusterOptions)

    updatePosition()

    return element
  }

  async function getFactory(): Promise<ArtifactFactory | ArtifactClusterFactory> {
    if (artifact) {
      return await artifactFactory(artifact, { cullAtZoomThreshold: false })
    }

    return await artifactClusterFactory()
  }

  function updatePosition(): void {
    if (!date || !layout.isTemporal()) {
      return
    }

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

  function getDate(): Date | null {
    return date
  }

  function getIds(): string[] | null {
    return ids
  }

  return {
    element,
    isCluster,
    getDate,
    getIds,
    render,
  }
}