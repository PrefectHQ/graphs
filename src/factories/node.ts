import { Container } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { animationFactory } from '@/factories/animation'
import { artifactFactory, ArtifactFactory } from '@/factories/artifact'
import { FlowRunContainer, flowRunContainerFactory } from '@/factories/nodeFlowRun'
import { TaskRunContainer, taskRunContainerFactory } from '@/factories/nodeTaskRun'
import { RunGraphArtifact } from '@/models'
import { BoundsContainer } from '@/models/boundsContainer'
import { Pixels } from '@/models/layout'
import { RunGraphData, RunGraphNode } from '@/models/RunGraph'
import { waitForApplication } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { waitForCull } from '@/objects/culling'
import { emitter } from '@/objects/events'
import { isSelected, selectItem } from '@/objects/selection'
import { layout, waitForSettings } from '@/objects/settings'

export type NodeContainerFactory = Awaited<ReturnType<typeof nodeContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeContainerFactory(node: RunGraphNode, nestedGraphData: RunGraphData | undefined) {
  const config = await waitForConfig()
  const application = await waitForApplication()
  const cull = await waitForCull()
  const settings = await waitForSettings()
  let artifactsContainer: Container | null = null
  const artifacts: Map<string, ArtifactFactory> = new Map()
  const { animate } = await animationFactory()
  const { element: container, render: renderNode, bar } = await getNodeFactory(node, nestedGraphData)

  let internalNode = node
  let internalNestedGraphData = nestedGraphData
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

  if (!internalNode.end_time) {
    startTicking()
  }

  emitter.on('itemSelected', () => {
    const isCurrentlySelected = isSelected({ kind: internalNode.kind, id: internalNode.id })

    if (isCurrentlySelected !== nodeIsSelected) {
      nodeIsSelected = isCurrentlySelected
      renderNode(internalNode, internalNestedGraphData)
    }
  })

  async function render(newNodeData: RunGraphNode, newNested: RunGraphData | undefined): Promise<BoundsContainer> {
    internalNode = newNodeData
    internalNestedGraphData = newNested

    const currentCacheKey = getNodeCacheKey(newNodeData)

    if (currentCacheKey === cacheKey) {
      return container
    }

    cacheKey = currentCacheKey

    await Promise.all([
      renderNode(newNodeData, newNested),
      createArtifacts(newNodeData.artifacts),
    ])

    if (newNodeData.end_time) {
      stopTicking()
    }

    return container
  }

  async function createArtifacts(artifactsData?: RunGraphArtifact[]): Promise<void> {
    if (!artifactsData) {
      return
    }

    createArtifactsContainer()

    if (settings.disableArtifacts || !layout.isTemporal()) {
      return
    }

    const promises: Promise<void>[] = []

    for (const artifact of artifactsData) {
      promises.push(createArtifact(artifact))
    }

    await Promise.all(promises)

    alignArtifacts()
  }

  async function createArtifact(artifact: RunGraphArtifact): Promise<void> {
    if (artifacts.has(artifact.id)) {
      return artifacts.get(artifact.id)!.render(artifact)
    }

    const factory = await artifactFactory(artifact, { enableLocalClickHandling: true })

    artifacts.set(artifact.id, factory)

    artifactsContainer!.addChild(factory.element)

    return factory.render(artifact)
  }

  function createArtifactsContainer(): void {
    if (layout.isTemporal() && !settings.disableArtifacts) {
      if (!artifactsContainer) {
        artifactsContainer = new Container()
      }

      container.addChild(artifactsContainer)
      return
    }

    if (artifactsContainer) {
      container.removeChild(artifactsContainer)
    }
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

  function startTicking(): void {
    application.ticker.add(tick)
  }

  function stopTicking(): void {
    application.ticker.remove(tick)
  }

  function tick(): void {
    render(internalNode, internalNestedGraphData)
  }

  async function getNodeFactory(nodeData: RunGraphNode, nestedGraph: RunGraphData | undefined): Promise<TaskRunContainer | FlowRunContainer> {
    const { kind } = nodeData

    switch (kind) {
      case 'task-run':
        return await taskRunContainerFactory(nodeData, nestedGraph)
      case 'flow-run':
        return await flowRunContainerFactory(nodeData)
      default:
        const exhaustive: never = kind
        throw new Error(`switch does not have case for value: ${exhaustive}`)
    }
  }

  function getNodeCacheKey(nodeData: RunGraphNode): string {
    const endTime = nodeData.end_time ?? new Date()
    const artifactCacheKey = nodeData.artifacts?.map(artifact => {
      if (artifact.type === 'progress') {
        return `${artifact.id}-${artifact.data}`
      }
      return artifact.id
    }).join('|')

    const hasNestedGraph = Boolean(internalNestedGraphData)

    const values = [
      nodeData.state_type,
      endTime.getTime(),
      layout.horizontal,
      layout.horizontalScaleMultiplier,
      config.styles.colorMode,
      settings.disableArtifacts || artifactCacheKey,
      hasNestedGraph,
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