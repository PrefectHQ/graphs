import { ArtifactFactory, artifactFactory, isArtifactFactory } from '@/factories/artifact'
import { ArtifactClusterFactory, ArtifactClusterFactoryRenderProps, artifactClusterFactory } from '@/factories/artifactCluster'
import { ArtifactSelection, ArtifactsSelection, RunGraphArtifact } from '@/models'
import { waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { selectItem } from '@/objects/selection'
import { layout, waitForSettings } from '@/objects/settings'
import { itemIsClusterFactory } from '@/utilities/detectHorizontalCollisions'

export type NodeFlowRunArtifactFactory = Awaited<ReturnType<typeof nodeFlowRunArtifactFactory>>

type NodeFlowRunArtifactFactorySharedOptions = {
  parentStartDate?: Date,
}

type NodeFlowRunArtifactFactoryOptions =
  NodeFlowRunArtifactFactorySharedOptions
  & ({ type: 'artifact', artifact: RunGraphArtifact } | { type: 'cluster' })

type FactoryType<T> = T extends { type: 'artifact' }
  ? ArtifactFactory
  : T extends { type: 'cluster' }
    ? ArtifactClusterFactory
    : never

type RenderPropsType<T> = T extends { type: 'cluster' }
  ? ArtifactClusterFactoryRenderProps
  : undefined

export async function nodeFlowRunArtifactFactory<T extends NodeFlowRunArtifactFactoryOptions>(options: T): Promise<FactoryType<T>> {
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  const settings = await waitForSettings()
  let scale = await waitForScale()

  const factory = await getFactory() as FactoryType<T>

  factory.element.on('click', clickEvent => {
    clickEvent.stopPropagation()

    const { element } = factory

    const globalPosition = element.getGlobalPosition()

    const position = {
      x: globalPosition.x,
      y: globalPosition.y,
      width: element.width * viewport.scale.x,
      height: element.height * viewport.scale.y,
    }

    const selectSettings: ArtifactSelection | ArtifactsSelection = itemIsClusterFactory(factory)
      ? { kind: 'artifacts', ids: factory.getIds(), position }
      : { kind: 'artifact', id: factory.getId() }

    selectItem(selectSettings)
  })

  emitter.on('scaleUpdated', updated => {
    scale = updated
    updatePosition()
  })

  async function render(props?: RenderPropsType<T>): Promise<void> {
    if (isArtifactFactory(factory)) {
      if (options.type !== 'artifact') {
        throw new Error(`ArtifactFactory attempted to render a ${options.type}`)
      }

      await factory.render(options.artifact)
    } else {
      await factory.render(props)
    }

    updatePosition()
  }

  async function getFactory(): Promise<ArtifactFactory | ArtifactClusterFactory> {
    if (options.type === 'artifact') {
      return await artifactFactory(options.artifact)
    }

    return await artifactClusterFactory()
  }

  function updatePosition(): void {
    const date = factory.getDate()
    const { parentStartDate } = options

    if (!date || !layout.isTemporal() || settings.disableArtifacts || !parentStartDate) {
      return
    }

    const selected = factory.getSelected()
    const { element } = factory

    let selectedOffset = 0

    if (selected) {
      const { selectedBorderOffset, selectedBorderWidth } = config.styles
      selectedOffset = selectedBorderOffset + selectedBorderWidth * 2
    }

    const x = scale(date) - scale(parentStartDate)
    const centeredX = x - (element.width - selectedOffset) / 2
    const y = -(element.height - selectedOffset)

    element.position.set(centeredX, y)
  }

  return {
    ...factory,
    render,
  }
}