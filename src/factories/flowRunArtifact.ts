import { ArtifactFactory, artifactFactory } from '@/factories/artifact'
import { ArtifactClusterFactory, ArtifactClusterFactoryRenderProps, artifactClusterFactory } from '@/factories/artifactCluster'
import { ArtifactSelection, ArtifactsSelection, RunGraphArtifact } from '@/models'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForRunEvents } from '@/objects/flowRunEvents'
import { waitForScale } from '@/objects/scale'
import { selectItem } from '@/objects/selection'
import { layout, waitForSettings } from '@/objects/settings'
import { itemIsClusterFactory } from '@/utilities/detectHorizontalCollisions'

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
  const events = await waitForRunEvents()

  let scale = await waitForScale()

  let flowHasEvents = events && events.length > 0

  const factory = await getFactory() as FactoryType<T>

  factory.element.on('click', clickEvent => {
    clickEvent.stopPropagation()

    const { element } = factory

    const globalPosition = element.getGlobalPosition()

    const position = {
      x: globalPosition.x,
      y: globalPosition.y,
      width: element.width,
      height: element.height,
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
  emitter.on('viewportMoved', () => updatePosition())
  emitter.on('eventDataCreated', (data) => {
    flowHasEvents = data.length > 0
    updatePosition()
  })
  emitter.on('eventDataUpdated', (data) => {
    flowHasEvents = data.length > 0
    updatePosition()
  })

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
    const { eventTargetSize, flowStateSelectedBarHeight } = config.styles

    let selectedOffset = 0

    if (selected) {
      const { selectedBorderOffset, selectedBorderWidth } = config.styles
      selectedOffset = selectedBorderOffset + selectedBorderWidth * 2
    }

    const x = scale(date) * viewport.scale._x + viewport.worldTransform.tx
    const centeredX = x - (element.width - selectedOffset) / 2

    const bottomOffset = flowHasEvents && !settings.disableEvents ? eventTargetSize : flowStateSelectedBarHeight
    const y = application.screen.height
      - (element.height - selectedOffset)
      - bottomOffset

    element.position.set(centeredX, y)
  }

  return {
    ...factory,
    render,
  }
}