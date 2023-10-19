import { Container } from 'pixi.js'
import { DEFAULT_NODES_CONTAINER_NAME, DEFAULT_POLL_INTERVAL } from '@/consts'
import { NodeContainerFactory, nodeContainerFactory } from '@/factories/node'
import { offsetsFactory } from '@/factories/offsets'
import { horizontalSettingsFactory, verticalSettingsFactory } from '@/factories/settings'
import { NodeLayoutResponse, NodeWidths, Pixels } from '@/models/layout'
import { RunGraphData, RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { exhaustive } from '@/utilities/exhaustive'
import { WorkerLayoutMessage, WorkerMessage, layoutWorkerFactory } from '@/workers/runGraph'

export type NodesContainer = Awaited<ReturnType<typeof nodesContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodesContainerFactory(runId: string) {
  const worker = layoutWorkerFactory(onmessage)
  const nodes = new Map<string, NodeContainerFactory>()
  const container = new Container()
  const config = await waitForConfig()
  const rows = await offsetsFactory()

  let data: RunGraphData | null = null
  let layout: NodeLayoutResponse = new Map()
  let interval: ReturnType<typeof setInterval> | undefined = undefined

  container.name = DEFAULT_NODES_CONTAINER_NAME

  emitter.on('layoutUpdated', () => renderNodes())

  async function render(): Promise<void> {
    if (data === null) {
      await fetch()
    }

    if (data === null) {
      throw new Error('Data was null after fetch')
    }

    await renderNodes()
  }

  async function fetch(): Promise<void> {
    clearInterval(interval)

    data = await config.fetch(runId)

    if (!data.end_time) {
      interval = setTimeout(() => fetch(), DEFAULT_POLL_INTERVAL)
    }
  }

  async function renderNodes(): Promise<void> {
    if (data === null) {
      return
    }

    const widths: NodeWidths = new Map()

    for (const [nodeId, node] of data.nodes) {
      // eslint-disable-next-line no-await-in-loop
      const { width } = await renderNode(node)

      widths.set(nodeId, width)
    }

    worker.postMessage({
      type: 'layout',
      data,
      widths,
      horizontalSettings: horizontalSettingsFactory(data.start_time),
      verticalSettings: verticalSettingsFactory(),
    })
  }

  async function renderNode(node: RunGraphNode): Promise<Container> {
    const { render } = await getNodeContainerService(node)

    return await render(node)
  }

  function setPositions(): void {
    layout.forEach((position, nodeId) => {
      const node = nodes.get(nodeId)

      if (!node) {
        console.warn(`Count not find ${nodeId} from layout in nodes`)
        return
      }

      node.container.position = getActualPosition(position)
    })

    container.emit('resized')
    container.emit('rendered')
  }

  async function getNodeContainerService(node: RunGraphNode): Promise<NodeContainerFactory> {
    const existing = nodes.get(node.id)

    if (existing) {
      return existing
    }

    const response = await nodeContainerFactory(node)

    response.container.on('resized', () => resizeNode(node.id))

    nodes.set(node.id, response)
    container.addChild(response.container)

    return response
  }

  function resizeNode(nodeId: string): void {
    const node = nodes.get(nodeId)
    const nodeLayout = layout.get(nodeId)

    if (!node || !nodeLayout) {
      return
    }

    const axis = nodeLayout.y
    const offset = node.container.height

    rows.setOffset({ axis, nodeId, offset })

    setPositions()
  }

  function getActualPosition(position: Pixels): Pixels {
    const y = rows.getTotalOffset(position.y)
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

    setPositions()
  }

  function stop(): void {
    clearInterval(interval)
    data = null
  }

  return {
    container,
    render,
    stop,
  }
}