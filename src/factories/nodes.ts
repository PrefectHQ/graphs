import { Container } from 'pixi.js'
import { DEFAULT_NODES_CONTAINER_NAME, DEFAULT_POLL_INTERVAL } from '@/consts'
import { EdgeFactory, edgeFactory } from '@/factories/edge'
import { NodeContainerFactory, nodeContainerFactory } from '@/factories/node'
import { offsetsFactory } from '@/factories/offsets'
import { horizontalSettingsFactory, verticalSettingsFactory } from '@/factories/settings'
import { NodesLayoutResponse, NodeSize, NodeWidths, Pixels } from '@/models/layout'
import { RunGraphData, RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { exhaustive } from '@/utilities/exhaustive'
import { WorkerLayoutMessage, WorkerMessage, layoutWorkerFactory } from '@/workers/runGraph'

// parentId-childId
type EdgeKey = `${string}_${string}`

export type NodesContainer = Awaited<ReturnType<typeof nodesContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodesContainerFactory(runId: string) {
  const worker = layoutWorkerFactory(onmessage)
  const nodes = new Map<string, NodeContainerFactory>()
  const edges = new Map<EdgeKey, EdgeFactory>()
  const container = new Container()
  const config = await waitForConfig()
  const rows = await offsetsFactory()

  let data: RunGraphData | null = null
  let layout: NodesLayoutResponse = new Map()
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

    await Promise.all([
      renderNodes(),
      renderEdges(),
    ])
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
      // todo: this await is probably making this slower. Probably be faster with a Promise.all
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
    const { render } = await getNodeContainerFactory(node)

    return await render(node)
  }

  async function renderEdges(): Promise<void> {
    if (data === null) {
      return
    }

    const promises: Promise<Container>[] = []

    for (const [nodeId, { children }] of data.nodes) {
      for (const { id: childId } of children) {
        promises.push(renderEdge(nodeId, childId))
      }
    }

    await Promise.all(promises)
  }

  async function renderEdge(parentId: string, childId: string): Promise<Container> {
    const { render } = await getEdgeFactory(parentId, childId)

    return await render({ x: 0, y: 0 })
  }

  async function getEdgeFactory(parentId: string, childId: string): Promise<EdgeFactory> {
    const key: EdgeKey = `${parentId}_${childId}`
    const existing = edges.get(key)

    if (existing) {
      return existing
    }

    const edge = await edgeFactory()

    edges.set(key, edge)
    container.addChild(edge.container)

    return edge
  }

  function setPositions(): void {
    for (const [nodeId, { container }] of nodes) {
      const position = layout.get(nodeId)

      if (!position) {
        console.warn(`Could not find node in layout: Skipping ${nodeId}`)
        return
      }

      container.position = getActualPosition(position)
    }

    for (const [edgeId, edge] of edges) {
      const [parentId, childId] = edgeId.split('_')
      const parentPosition = layout.get(parentId)
      const childPosition = layout.get(childId)
      const parentNode = nodes.get(parentId)

      if (!parentPosition || !childPosition) {
        console.warn(`Could not find edge in layout: Skipping ${edgeId}`)
        return
      }

      if (!parentNode) {
        console.warn(`Could not find parent node in nodes: Skipping ${parentId}`)
        return
      }

      const parentBarWidth = parentNode.bar.width

      const parentActualPosition = getActualPosition(parentPosition)
      const parentActualPositionOffset = {
        x: parentActualPosition.x + parentBarWidth,
        y: parentActualPosition.y + config.styles.nodeHeight / 2,
      }
      const childActualPosition = getActualPosition(childPosition)
      const childActualPositionOffset = {
        x: childActualPosition.x - parentActualPositionOffset.x,
        y: childActualPosition.y - parentActualPositionOffset.y + config.styles.nodeHeight / 2,
      }

      edge.container.position = parentActualPositionOffset
      edge.render(childActualPositionOffset)
    }

    resized()

    container.emit('rendered')
  }

  async function getNodeContainerFactory(node: RunGraphNode): Promise<NodeContainerFactory> {
    const existing = nodes.get(node.id)

    if (existing) {
      return existing
    }

    const response = await nodeContainerFactory(node)

    response.container.on('resized', size => resizeNode(node.id, size))

    nodes.set(node.id, response)
    container.addChild(response.container)

    return response
  }

  function resizeNode(nodeId: string, size: NodeSize): void {
    const node = nodes.get(nodeId)
    const nodeLayout = layout.get(nodeId)

    if (!node || !nodeLayout) {
      return
    }

    const axis = nodeLayout.y
    const offset = size.height

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

  function resized(): void {
    const height = getHeight()

    container.emit('resized', { height })
  }

  function getHeight(): number {
    // todo: this should probably come from the layout itself
    let maxRow = 0

    for (const [, position] of layout) {
      maxRow = Math.max(maxRow, position.y)
    }

    const height = rows.getTotalValue(maxRow)

    return height
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
    getHeight,
    render,
    stop,
  }
}