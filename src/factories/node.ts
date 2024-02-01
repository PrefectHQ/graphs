import { Container } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { animationFactory } from '@/factories/animation'
import { ArtifactFactory, artifactFactory } from '@/factories/artifact'
import { FlowRunContainer, flowRunContainerFactory } from '@/factories/nodeFlowRun'
import { TaskRunContainer, taskRunContainerFactory } from '@/factories/nodeTaskRun'
import { Artifact } from '@/models'
import { BoundsContainer } from '@/models/boundsContainer'
import { Pixels } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForApplication } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { waitForCull } from '@/objects/culling'
import { emitter } from '@/objects/events'
import { isSelected, selectNode } from '@/objects/selection'
import { layout } from '@/objects/settings'

export type NodeContainerFactory = Awaited<ReturnType<typeof nodeContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeContainerFactory(node: RunGraphNode) {
  const artifacts = new Map<string, ArtifactFactory>()
  const config = await waitForConfig()
  const application = await waitForApplication()
  const cull = await waitForCull()
  const { animate } = await animationFactory()
  const { element: container, render: renderNode, bar } = await getNodeFactory(node)
  const artifactsContainer = new Container()

  let internalNode = node
  let cacheKey: string | null = null
  let nodeIsSelected = false
  let initialized = false

  container.addChild(artifactsContainer)

  cull.add(container)

  container.eventMode = 'static'
  container.cursor = 'pointer'
  container.name = DEFAULT_NODE_CONTAINER_NAME

  container.on('click', event => {
    event.stopPropagation()
    selectNode(internalNode)
  })

  if (!node.end_time) {
    startTicking()
  }

  emitter.on('nodeSelected', () => {
    const isCurrentlySelected = isSelected(node)

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

    await renderNode(node)

    if (node.end_time) {
      stopTicking()
    }

    return container
  }

  async function renderArtifacts(artifactsData: Artifact[]): Promise<Container> {
    const promises: Promise<ArtifactFactory>[] = []

    for (const artifact of artifactsData) {
      const exists = artifacts.has(artifact.id)

      if (exists) {
        continue
      }

      promises.push(createArtifact(artifact))
    }

    await Promise.all(promises)

    // TODO: Update artifact positions

    return artifactsContainer
  }

  async function createArtifact(artifact: Artifact): Promise<ArtifactFactory> {
    const factory = await artifactFactory(artifact)

    artifacts.set(artifact.id, factory)
    artifactsContainer.addChild(factory.element)
    factory.render()

    return factory
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
    const values = [
      node.state_type,
      endTime.getTime(),
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
    renderArtifacts,
    bar,
    setPosition,
  }
}