import { Container } from 'pixi.js'
import { DEFAULT_NODES_CONTAINER_NAME } from '@/consts'
import { EdgeFactory, edgeFactory } from '@/factories/edge'
import { NodeContainerFactory, nodeContainerFactory } from '@/factories/node'
import { offsetsFactory } from '@/factories/offsets'
import { horizontalScaleFactory } from '@/factories/position'
import { horizontalSettingsFactory, verticalSettingsFactory } from '@/factories/settings'
import { BoundsContainer } from '@/models/boundsContainer'
import { NodesLayoutResponse, NodeSize, NodeWidths, Pixels, NodeLayoutResponse } from '@/models/layout'
import { RunGraphData, RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { getHorizontalColumnSize, layout, waitForSettings } from '@/objects/settings'
import { exhaustive } from '@/utilities/exhaustive'
import { WorkerLayoutMessage, WorkerMessage, layoutWorkerFactory } from '@/workers/runGraph'

// parentId-childId
type EdgeKey = `${string}_${string}`

export type NodesContainer = Awaited<ReturnType<typeof nodesContainerFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodesContainerFactory() {
  const worker = layoutWorkerFactory(onmessage)
  const nodes = new Map<string, NodeContainerFactory>()
  const edges = new Map<EdgeKey, EdgeFactory>()
  const container = new Container()
  const edgesContainer = new Container()
  const config = await waitForConfig()

  // used for both vertical layouts
  const rows = offsetsFactory({
    gap: () => config.styles.rowGap,
    minimum: () => config.styles.nodeHeight,
  })

  // used only for the dependency layout
  const columns = offsetsFactory({
    gap: () => config.styles.columnGap,
    minimum: () => getHorizontalColumnSize(),
  })

  let nodesLayout: NodesLayoutResponse | null = null
  let runData: RunGraphData | null = null

  container.name = DEFAULT_NODES_CONTAINER_NAME

  emitter.on('layoutSettingsUpdated', () => {
    if (Boolean(runData) && Boolean(container.parent)) {
      rows.clear()
      columns.clear()
      render(runData!)
    }
  })

  async function render(data: RunGraphData): Promise<void> {
    runData = data
    nodesLayout = null

    await Promise.all([
      createNodes(data),
      createEdges(data),
    ])

    getLayout(data)
  }

  async function createNodes(data: RunGraphData): Promise<void> {
    const promises: Promise<Container>[] = []

    for (const node of data.nodes.values()) {
      promises.push(createNode(node))
    }

    await Promise.all(promises)
  }

  async function createNode(node: RunGraphNode): Promise<BoundsContainer> {
    const { render } = await getNodeContainerFactory(node)

    return await render(node)
  }

  async function createEdges(data: RunGraphData): Promise<void> {
    const settings = await waitForSettings()

    if (settings.disableEdges) {
      container.removeChild(edgesContainer)
      return
    }

    container.addChildAt(edgesContainer, 0)

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
    edgesContainer.addChild(edge.element)
  }

  function getLayout(data: RunGraphData): void {
    const widths: NodeWidths = new Map()

    for (const [nodeId, { element }] of nodes) {
      widths.set(nodeId, element.width)
    }

    worker.postMessage({
      type: 'layout',
      data,
      widths,
      horizontalSettings: horizontalSettingsFactory(data.start_time),
      verticalSettings: verticalSettingsFactory(),
    })
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

      edge.setPosition(parentActualPositionOffset, childActualPositionOffset)
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

      node.setPosition(newPosition)
    }

    renderEdges()

    container.emit('rendered')
    container.emit('resized', getSize())
  }

  async function getNodeContainerFactory(node: RunGraphNode): Promise<NodeContainerFactory> {
    const existing = nodes.get(node.id)

    if (existing) {
      return existing
    }

    const response = await nodeContainerFactory(node)

    response.element.on('resized', size => resizeNode(node.id, size))

    nodes.set(node.id, response)
    container.addChild(response.element)

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

    rows.setOffset({ nodeId, axis: nodeLayout.y, offset: size.height })
    columns.setOffset({ nodeId, axis: nodeLayout.column, offset: size.width })

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
    if (layout.isDependency()) {
      return columns.getTotalOffset(position.column)
    }

    return position.x
  }

  function getHeight(): number {
    if (!nodesLayout) {
      return 0
    }

    return rows.getTotalValue(nodesLayout.maxRow)
  }

  function getWidth(): number {
    if (!nodesLayout || !runData) {
      return 0
    }

    if (layout.isDependency()) {
      return columns.getTotalValue(nodesLayout.maxColumn)
    }

    const settings = horizontalSettingsFactory(runData.start_time)
    const scale = horizontalScaleFactory(settings)
    const end = scale(runData.end_time ?? new Date())
    const start = scale(runData.start_time)
    const width = end - start

    return width
  }

  function getSize(): { width: number, height: number } {
    return {
      width: getWidth(),
      height: getHeight(),
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
    nodesLayout = data.layout
    setPositions()
  }

  return {
    element: container,
    getSize,
    render,
  }
}