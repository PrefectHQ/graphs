import { Container, Ticker } from 'pixi.js'
import { FlowRunContainer, flowRunContainerFactory } from '@/factories/flowRun'
import { TaskRunContainer, taskRunContainerFactory } from '@/factories/taskRun'
import { RunGraphNode } from '@/models/RunGraph'

export type NodeContainerFactory = Awaited<ReturnType<typeof nodeContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeContainerFactory(node: RunGraphNode) {
  const { container, render: renderNode } = await getNodeFactory(node)
  const cacheKey: string | null = null

  async function render(node: RunGraphNode): Promise<Container> {
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

  return {
    render,
    container,
  }
}