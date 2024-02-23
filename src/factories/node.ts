import { Container } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { animationFactory } from '@/factories/animation'
import { artifactFactory, ArtifactFactory } from '@/factories/artifact'
import { eventFactory, EventFactory } from '@/factories/event'
import { eventClusterFactory, EventClusterFactory } from '@/factories/eventCluster'
import { FlowRunContainer, flowRunContainerFactory } from '@/factories/nodeFlowRun'
import { TaskRunContainer, taskRunContainerFactory } from '@/factories/nodeTaskRun'
import { Artifact, Event } from '@/models'
import { BoundsContainer } from '@/models/boundsContainer'
import { Pixels } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForApplication } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { waitForCull } from '@/objects/culling'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { isSelected, selectItem } from '@/objects/selection'
import { layout, waitForSettings } from '@/objects/settings'
import { clusterHorizontalCollisions } from '@/utilities/detectHorizontalCollisions'

export type NodeContainerFactory = Awaited<ReturnType<typeof nodeContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeContainerFactory(node: RunGraphNode) {
  const config = await waitForConfig()
  const application = await waitForApplication()
  const cull = await waitForCull()
  const settings = await waitForSettings()
  let scale = await waitForScale()
  const { animate } = await animationFactory()

  let artifactsContainer: Container | null = null
  const artifacts: Map<string, ArtifactFactory> = new Map()
  let eventsContainer: Container | null = null
  const events: Map<string, EventFactory | EventClusterFactory> = new Map()
  const clusterNodes: EventClusterFactory[] = []
  let availableClusterNodes: EventClusterFactory[] = []
  const { element: container, render: renderNode, bar } = await getNodeFactory(node)

  let internalNode = node
  let cacheKey: string | null = null
  let nodeIsSelected = false
  let initialized = false

  cull.add(container)

  container.eventMode = 'static'
  container.cursor = 'pointer'
  container.name = DEFAULT_NODE_CONTAINER_NAME

  container.on('click', event => {
    event.stopPropagation()
    selectItem({ kind: internalNode.kind, id: internalNode.id })
  })

  if (!node.end_time) {
    startTicking()
  }

  emitter.on('scaleUpdated', updated => {
    scale = updated
    render(internalNode)
  })
  emitter.on('itemSelected', () => {
    const isCurrentlySelected = isSelected({ kind: internalNode.kind, id: internalNode.id })

    if (isCurrentlySelected !== nodeIsSelected) {
      nodeIsSelected = isCurrentlySelected
      renderNode(internalNode)
    }
  })

  async function render(node: RunGraphNode): Promise<BoundsContainer> {
    internalNode = node

    const currentCacheKey = getNodeCacheKey(node)

    if (currentCacheKey === cacheKey) {
      return container
    }

    cacheKey = currentCacheKey

    await Promise.all([
      renderNode(node),
      createArtifacts(node.artifacts),
      createEvents(node.events),
    ])

    if (artifactsContainer) {
      artifactsContainer.visible = !settings.disableArtifacts
    }

    if (eventsContainer && !layout.isTemporal()) {
      eventsContainer.visible = false
    } else if (eventsContainer) {
      eventsContainer.visible = !settings.disableEvents
    }

    if (node.end_time) {
      stopTicking()
    }

    return container
  }

  async function createArtifacts(artifactsData?: Artifact[]): Promise<void> {
    if (!artifactsData || settings.disableArtifacts) {
      return
    }

    if (!artifactsContainer) {
      createArtifactsContainer()
    }

    const promises: Promise<void>[] = []

    for (const artifact of artifactsData) {
      promises.push(createArtifact(artifact))
    }

    await Promise.all(promises)

    alignArtifacts()
  }

  async function createArtifact(artifact: Artifact): Promise<void> {
    if (artifacts.has(artifact.id)) {
      return artifacts.get(artifact.id)!.render()
    }

    const factory = await artifactFactory(artifact)

    artifacts.set(artifact.id, factory)

    artifactsContainer!.addChild(factory.element)

    return factory.render()
  }

  function createArtifactsContainer(): void {
    artifactsContainer = new Container()
    container.addChild(artifactsContainer)
  }

  function alignArtifacts(): void {
    if (!artifactsContainer) {
      return
    }

    const { artifactsGap, artifactsNodeOverlap } = config.styles
    let x = 0

    for (const artifact of artifacts.values()) {
      artifact.element.position.x = x
      x += artifact.element.width + artifactsGap
    }

    artifactsContainer.position.y = -artifactsContainer.height + artifactsNodeOverlap

    if (artifactsContainer.width < bar.width) {
      artifactsContainer.position.x = bar.width - artifactsContainer!.width
    }
  }

  async function createEvents(eventsData?: Event[]): Promise<void> {
    if (!eventsData || settings.disableEvents || !layout.isTemporal()) {
      return
    }

    if (!eventsContainer) {
      createEventsContainer()
    }

    const promises: Promise<void>[] = []

    for (const event of eventsData) {
      promises.push(createEvent(event))
    }

    await Promise.all(promises)

    for (const event of events.values()) {
      updateEventPosition(event)
    }

    availableClusterNodes = [...clusterNodes]

    await clusterHorizontalCollisions({
      items: events,
      createCluster,
    })

    for (const cluster of clusterNodes) {
      if (availableClusterNodes.includes(cluster)) {
        cluster.render()
        continue
      }

      updateEventPosition(cluster)
    }
  }

  function createEventsContainer(): void {
    eventsContainer = new Container()
    container.addChild(eventsContainer)
  }

  async function createEvent(event: Event): Promise<void> {
    if (events.has(event.id)) {
      const eventFactory = events.get(event.id)!
      return eventFactory.render()
    }

    const factory = await eventFactory(event)

    events.set(event.id, factory)
    eventsContainer!.addChild(factory.element)

    return factory.render()
  }

  async function createCluster(): Promise<EventClusterFactory> {
    if (availableClusterNodes.length > 0) {
      return availableClusterNodes.pop()!
    }

    const newCluster = await eventClusterFactory()
    container!.addChild(newCluster.element)
    clusterNodes.push(newCluster)

    return newCluster
  }

  function updateEventPosition(event: EventFactory | EventClusterFactory): void {
    const date = event.getDate()

    if (!date) {
      return
    }

    const { nodeHeight, eventSelectedBorderInset } = config.styles
    const x = scale(date) - scale(node.start_time) - event.element.width / 2

    event.element.position.x = x
    event.element.position.y = nodeHeight - eventSelectedBorderInset
  }

  function startTicking(): void {
    application.ticker.add(tick)
  }

  function stopTicking(): void {
    application.ticker.remove(tick)
  }

  function tick(): void {
    render(node)
  }

  async function getNodeFactory(node: RunGraphNode): Promise<TaskRunContainer | FlowRunContainer> {
    const { kind } = node

    switch (kind) {
      case 'task-run':
        return await taskRunContainerFactory()
      case 'flow-run':
        return await flowRunContainerFactory(node)
      default:
        const exhaustive: never = kind
        throw new Error(`switch does not have case for value: ${exhaustive}`)
    }
  }

  function getNodeCacheKey(node: RunGraphNode): string {
    const endTime = node.end_time ?? new Date()
    const artifactCount = node.artifacts?.length ?? 0
    const values = [
      node.state_type,
      endTime.getTime(),
      artifactCount,
      layout.horizontal,
      layout.horizontalScaleMultiplier,
      config.styles.colorMode,
    ]

    return values.join('-')
  }

  function setPosition({ x, y }: Pixels): void {
    animate(container, {
      x,
      y,
    }, !initialized)

    initialized = true
  }

  return {
    element: container,
    render,
    bar,
    setPosition,
  }
}