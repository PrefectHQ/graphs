import { Container } from 'pixi.js'
import { DEFAULT_LINEAR_COLUMN_SIZE_PIXELS, DEFAULT_NODES_CONTAINER_NAME, DEFAULT_POLL_INTERVAL } from '@/consts'
import { EdgeFactory, edgeFactory } from '@/factories/edge'
import { NodeContainerFactory, nodeContainerFactory } from '@/factories/node'
import { offsetsFactory } from '@/factories/offsets'
import { horizontalSettingsFactory, verticalSettingsFactory } from '@/factories/settings'
import { NodesLayoutResponse, NodeSize, NodeWidths, Pixels, NodeLayoutResponse } from '@/models/layout'
import { RunGraphData, RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { layout } from '@/objects/layout'
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
  const rows = await offsetsFactory({
    gap: config.styles.rowGap,
    minimum: config.styles.nodeHeight,
  })

  let initialized = false
  let data: RunGraphData | null = null
  let nodesLayout: NodesLayoutResponse | null = null
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
      createEdges(),
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

  async function createEdges(): Promise<void> {
    if (data === null) {
      return
    }

    const promises: Promise<void>[] = []

    for (const [nodeId, { children }] of data.nodes) {
      for (const { id: childId } of children) {
        promises.push(createEdge(nodeId, childId))
      }
    }

    await Promise.all(promises)
  }

  async function createEdge(parentId: string, childId: string): Promise<void> {
    const key: EdgeKey = `${parentId}_${childId}`

    // its possible a parent has duplicate children, bail if we've already created an edge
    if (edges.has(key)) {
      return
    }

    const edge = await edgeFactory()

    // this second check is necessary because all edges get created at the same time in a loop without awaiting individual
    // calls to this function. So an edge might get created twice but we want to make sure we don't add duplicate edge containers
    if (edges.has(key)) {
      return
    }

    edges.set(key, edge)
    container.addChild(edge.container)
  }

  function renderEdges(): void {
    if (!nodesLayout) {
      return
    }

    for (const [edgeId, edge] of edges) {
      const [parentId, childId] = edgeId.split('_')
      const parentPosition = nodesLayout.positions.get(parentId)
      const childPosition = nodesLayout.positions.get(childId)
      const parentNode = nodes.get(parentId)

      if (!parentPosition || !childPosition) {
        console.warn(`Could not find edge in layout: Skipping ${edgeId}`)
        continue
      }

      if (!parentNode) {
        console.warn(`Could not find parent node in nodes: Skipping ${parentId}`)
        continue
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

      edge.setPosition(parentActualPositionOffset, childActualPositionOffset, !initialized)
    }
  }

  function setPositions(): void {
    if (!nodesLayout) {
      return
    }

    for (const [nodeId, node] of nodes) {
      const position = nodesLayout.positions.get(nodeId)

      if (!position) {
        console.warn(`Could not find node in layout: Skipping ${nodeId}`)
        continue
      }

      const newPosition = getActualPosition(position)

      node.setPosition(newPosition, !initialized)
    }

    renderEdges()
    resized()

    initialized = true
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
    if (!nodesLayout) {
      return
    }

    const node = nodes.get(nodeId)
    const nodeLayout = nodesLayout.positions.get(nodeId)

    if (!node || !nodeLayout) {
      return
    }

    const axis = nodeLayout.y
    const offset = size.height

    rows.setOffset({ axis, nodeId, offset })

    setPositions()
  }

  function getActualPosition(position: NodeLayoutResponse): Pixels {
    const y = rows.getTotalOffset(position.y)
    const x = getActualXPosition(position)

    return {
      x,
      y,
    }
  }

  function getActualXPosition(position: NodeLayoutResponse): number {
    if (layout.horizontal === 'dependency') {
      return position.x + position.column * config.styles.columnGap
    }

    return position.x
  }

  function resized(): void {
    const height = getHeight()

    container.emit('resized', { height })
  }

  function getHeight(): number {
    if (!nodesLayout) {
      return 0
    }

    return rows.getTotalValue(nodesLayout.maxRow)
  }

  function getWidth(): number {
    if (!nodesLayout) {
      return 0
    }

    throw new Error('Not implemented')
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
    nodesLayout = data.layout

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