import { Ticker } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { animationFactory } from '@/factories/animation'
import { FlowRunContainer, flowRunContainerFactory } from '@/factories/nodeFlowRun'
import { TaskRunContainer, taskRunContainerFactory } from '@/factories/nodeTaskRun'
import { BoundsContainer } from '@/models/boundsContainer'
import { Pixels } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForCull } from '@/objects/culling'
import { emitter } from '@/objects/events'
import { isSelected, selectNode } from '@/objects/selection'

export type NodeContainerFactory = Awaited<ReturnType<typeof nodeContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeContainerFactory(node: RunGraphNode) {
  const cull = await waitForCull()
  const { animate } = await animationFactory()
  const { element: container, render: renderNode, bar } = await getNodeFactory(node)
  const cacheKey: string | null = null

  let nodeIsSelected = false

  cull.add(container)

  container.eventMode = 'static'
  container.cursor = 'pointer'
  container.name = DEFAULT_NODE_CONTAINER_NAME

  container.on('click', event => {
    event.stopPropagation()
    selectNode(node)
  })

  emitter.on('nodeSelected', () => {
    const isCurrentlySelected = isSelected(node)

    if (isCurrentlySelected !== nodeIsSelected) {
      nodeIsSelected = isCurrentlySelected
      renderNode(node)
    }
  })

  async function render(node: RunGraphNode): Promise<BoundsContainer> {
    const currentCacheKey = getNodeCacheKey(node)

    if (currentCacheKey === cacheKey) {
      return container
    }

    await renderNode(node)

    if (!node.end_time) {
      Ticker.shared.addOnce(() => render(node))
    }

    return container
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
    const keys = Object.keys(node).sort((keyA, keyB) => keyA.localeCompare(keyB)) as (keyof RunGraphNode)[]
    const values = keys.map(key => {
      const value = node[key] ?? new Date()

      return value.toString()
    })

    return values.join(',')
  }

  function setPosition({ x, y }: Pixels, skipAnimation?: boolean): void {
    animate(container, {
      x,
      y,
    }, skipAnimation)
  }

  return {
    element: container,
    render,
    bar,
    setPosition,
  }
}