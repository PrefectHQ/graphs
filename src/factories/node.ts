import { Container } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { animationFactory } from '@/factories/animation'
import { BoundsContainer } from '@/models/boundsContainer'
import { GraphNode } from '@/models/Graph'
import { Pixels } from '@/models/layout'
import { waitForApplication } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { waitForCull } from '@/objects/culling'
import { emitter } from '@/objects/events'
import { layout } from '@/objects/settings'

export type NodeContainerFactory = Awaited<NodeContainerFactoryReturn>

export type NodeContainerFactoryReturn = {
  element: Container,
  render: (node: GraphNode) => Promise<BoundsContainer>,
  bar: Container,
  setPosition: (position: Pixels) => void,
}

export async function nodeContainerFactory(node: GraphNode): Promise<NodeContainerFactoryReturn> {
  const config = await waitForConfig()
  const application = await waitForApplication()
  const cull = await waitForCull()
  const { animate } = await animationFactory()
  const { element: container, render: renderNode, bar } = await nodeContainerFactory(node)

  let internalNode = node
  let cacheKey: string | null = null
  let initialized = false

  cull.add(container)

  container.eventMode = 'static'
  container.cursor = 'pointer'
  container.name = DEFAULT_NODE_CONTAINER_NAME

  container.on('click', event => {
    event.stopPropagation()
    // node style callback
    // renderNode(internalNode, intrernalNestedGraphDat)
    // selectItem({ kind: internalNode.kind, id: internalNode.id })
  })

  if (!internalNode.end) {
    startTicking()
  }

  // emitter.on('itemSelected', () => {
  //   const isCurrentlySelected = isSelected({ kind: internalNode.kind, id: internalNode.id })

  //   if (isCurrentlySelected !== nodeIsSelected) {
  //     nodeIsSelected = isCurrentlySelected
  //     renderNode(internalNode, internalNestedGraphData)
  //   }
  // })

  async function render(newNode: GraphNode): Promise<BoundsContainer> {
    internalNode = newNode

    const currentCacheKey = getNodeCacheKey(newNode)

    if (currentCacheKey === cacheKey) {
      return container
    }

    cacheKey = currentCacheKey

    await Promise.all([renderNode(newNode)])

    if (newNode.end) {
      stopTicking()
    }

    return container
  }

  function startTicking(): void {
    application.ticker.add(tick)
  }

  function stopTicking(): void {
    application.ticker.remove(tick)
  }

  function tick(): void {
    render(internalNode)
  }

  function getNodeCacheKey(node: GraphNode): string {
    const endTime = node.end ?? new Date()

    const hasNestedGraph = Boolean(node.data)

    const values = [
      endTime.getTime(),
      layout.horizontal,
      layout.horizontalScaleMultiplier,
      config.styles.colorMode,
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