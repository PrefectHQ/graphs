import { Container } from 'pixi.js'
import { DEFAULT_NODES_CONTAINER_NAME, DEFAULT_POLL_INTERVAL } from '@/consts'
import { eventsFactory } from '@/factories/events'
import { NodeContainerFactory, nodeContainerFactory } from '@/factories/node'
import { offsetsFactory } from '@/factories/offsets'
import { HorizontalPositionSettings } from '@/factories/position'
import { horizontalSettingsFactory } from '@/factories/settings'
import { NodeLayoutRequest, NodeLayoutResponse, Pixels } from '@/models/layout'
import { RunGraphNode, RunGraphNodes } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { exhaustive } from '@/utilities/exhaustive'
import { WorkerLayoutMessage, WorkerMessage, layoutWorkerFactory } from '@/workers/runGraph'

export type NodesContainer = Awaited<ReturnType<typeof nodesContainerFactory>>

type Events = {
  rendered: void,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodesContainerFactory(runId: string) {
  const worker = layoutWorkerFactory(onmessage)
  const nodes = new Map<string, NodeContainerFactory>()
  const container = new Container()
  const config = await waitForConfig()
  const offsets = offsetsFactory()
  const events = eventsFactory<Events>()

  let settings: HorizontalPositionSettings
  let layout: NodeLayoutResponse = new Map()

  container.name = DEFAULT_NODES_CONTAINER_NAME

  fetch()

  async function fetch(): Promise<void> {
    const data = await config.fetch(runId)

    settings = horizontalSettingsFactory(data.start_time)

    await render(data.nodes)

    if (!data.end_time) {
      setTimeout(() => fetch(), DEFAULT_POLL_INTERVAL)
    }
  }

  async function render(nodes: RunGraphNodes): Promise<void> {
    const request: NodeLayoutRequest = new Map()

    for (const [nodeId, node] of nodes) {
      // eslint-disable-next-line no-await-in-loop
      const { width } = await renderNode(node)

      request.set(nodeId, {
        node,
        width,
      })
    }

    worker.postMessage({
      type: 'layout',
      nodes: request,
      settings,
    })
  }

  async function renderNode(node: RunGraphNode): Promise<Container> {
    const { render } = await getNodeContainerService(node)

    return await render(node)
  }

  function updateLayout(): void {
    layout.forEach((position, nodeId) => {
      const node = nodes.get(nodeId)

      if (!node) {
        console.warn(`Count not find ${nodeId} from layout in nodes`)
        return
      }

      node.container.position = getActualPosition(position)
    })

    events.emit('rendered')
  }

  async function getNodeContainerService(node: RunGraphNode): Promise<NodeContainerFactory> {
    const existing = nodes.get(node.id)

    if (existing) {
      return existing
    }

    const response = await nodeContainerFactory(node)

    nodes.set(node.id, response)
    container.addChild(response.container)

    return response
  }

  function getActualPosition(position: Pixels): Pixels {
    const y = offsets.getTotalOffset(position.y) + position.y * config.styles.nodeHeight
    const { x } = position

    return {
      x,
      y,
    }
  }

  function onmessage({ data }: MessageEvent<WorkerMessage>): void {
    const { type } = data

    switch (type) {
      case 'layout':
        handleLayoutMessage(data)
        return
      default:
        exhaustive(type)
    }
  }

  function handleLayoutMessage(data: WorkerLayoutMessage): void {
    // eslint-disable-next-line prefer-destructuring
    layout = data.layout

    updateLayout()
  }

  return {
    container,
    events,
  }
}