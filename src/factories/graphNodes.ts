import { Container } from 'pixi.js'
import { DEFAULT_NODES_CONTAINER_NAME } from '@/consts'
import { EdgeFactory, edgeFactory } from '@/factories/edge'
import { NodeContainerFactory, nodeContainerFactory } from '@/factories/node'
import { offsetsFactory } from '@/factories/offsets'
import { horizontalScaleFactory } from '@/factories/position'
import { horizontalSettingsFactory, verticalSettingsFactory } from '@/factories/settings'
import { BoundsContainer } from '@/models/boundsContainer'
import { GraphData, GraphNode } from '@/models/Graph'
import { NodesLayoutResponse, NodeSize, NodeWidths, Pixels, NodeLayoutResponse } from '@/models/layout'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { getSelectedRunGraphNode } from '@/objects/selection'
import { getHorizontalColumnSize, layout, waitForSettings } from '@/objects/settings'
import { exhaustive } from '@/utilities/exhaustive'
import { IGraphWorker, WorkerLayoutMessage, WorkerMessage, layoutWorkerFactory } from '@/workers/graph'

// parentId-childId
type EdgeKey = `${string}_${string}`

export type NodesContainer = Awaited<NodesContainerFactoryReturn>

export type NodesContainerFactoryReturn = {
  element: Container,
  stopWorker: () => void,
  getSize: () => { width: number, height: number },
  render: (data: GraphData) => Promise<void>,
}

export async function nodesContainerFactory(): Promise<NodesContainerFactoryReturn> {
  const nodePromises = new Map<string, Promise<NodeContainerFactory>>()
  const nodes = new Map<string, NodeContainerFactory>()
  const edges = new Map<EdgeKey, EdgeFactory>()
  const container = new Container()
  const edgesContainer = new Container()
  const config = await waitForConfig()

  let worker: IGraphWorker | null = null

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
  let graphData: GraphData | null = null

  container.name = DEFAULT_NODES_CONTAINER_NAME

  emitter.on('layoutUpdated', () => {
    rows.clear()
    columns.clear()
  })

  emitter.on('layoutSettingsUpdated', () => graphData && render(graphData))

  async function render(data: GraphData): Promise<void> {
    startWorker()

    graphData = data
    nodesLayout = null

    await Promise.all([
      createNodes(graphData),
      createEdges(graphData),
    ])

    getLayout(graphData)
  }

  function startWorker(): void {
    if (worker) {
      return
    }

    worker = layoutWorkerFactory(onmessage)
  }

  function stopWorker(): void {
    if (!worker) {
      return
    }

    worker.terminate()
    worker = null
  }

  async function createNodes(data: GraphData): Promise<void> {
    const promises: Promise<Container>[] = []

    for (const node of data.nodes.values()) {
      promises.push(createNode(node))
    }

    await Promise.all(promises)
  }

  async function createNode(node: GraphNode): Promise<BoundsContainer> {
    const { render } = await getNodeContainerFactory(node)
    return await render(node)
  }

  async function createEdges(data: GraphData): Promise<void> {
    const settings = await waitForSettings()

    if (settings.disableEdges) {
      container.removeChild(edgesContainer)
      return
    }

    container.addChildAt(edgesContainer, 0)

    const promises: Promise<void>[] = []

    for (const [parentId, { children }] of data.nodes) {
      for (const { id: childId } of children) {
        promises.push(createEdge(parentId, childId))
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

  function getLayout(data: GraphData): void {
    if (!worker) {
      throw new Error('Layout worker not initialized')
    }

    const widths: NodeWidths = new Map()

    for (const [nodeId, { element }] of nodes) {
      widths.set(nodeId, element.width)
    }

    worker.postMessage({
      type: 'layout',
      data,
      widths,
      horizontalSettings: horizontalSettingsFactory(data.start),
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

      rows.updateNodeAxis({ nodeId, axis: position.y })
      columns.updateNodeAxis({ nodeId, axis: position.column })
    }

    renderEdges()

    container.emit('rendered')
    container.emit('resized', getSize())
  }

  async function getNodeContainerFactory(node: GraphNode): Promise<NodeContainerFactory> {
    const existingPromise = nodePromises.get(node.id)

    if (existingPromise) {
      return existingPromise
    }

    const factory = nodeContainerFactory(node)

    nodePromises.set(node.id, factory)

    const response = await factory

    response.element.on('resized', size => resizeNode(node.id, size))

    container.addChild(response.element)

    nodes.set(node.id, response)

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
    if (!nodesLayout || !graphData) {
      return 0
    }

    if (layout.isDependency()) {
      return columns.getTotalValue(nodesLayout.maxColumn)
    }

    const settings = horizontalSettingsFactory(graphData.start)
    const scale = horizontalScaleFactory(settings)
    const end = scale(graphData.end ?? new Date())
    const start = scale(graphData.start)
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

  async function highlightSelectedNode(): Promise<void> {
    const settings = await waitForSettings()
    const selected = getSelectedRunGraphNode()

    if (settings.disableEdges || !selected || !graphData?.nodes.has(selected.id)) {
      highlightPath([])
      return
    }

    const path = getDependencyPathIds(selected.id)

    highlightPath(path)
  }

  function highlightPath(path: string[]): void {
    highlightNodes(path)
    highlightEdges(path)
  }

  function highlightNodes(path: string[]): void {
    for (const [nodeId, { element }] of nodes) {
      const highlight = path.length === 0 || path.includes(nodeId)

      if (highlight) {
        element.alpha = 1
        continue
      }

      element.alpha = config.styles.nodeUnselectedAlpha
    }
  }

  function highlightEdges(path: string[]): void {
    for (const [edgeId, { element }] of edges) {
      const [parentId, childId] = edgeId.split('_')
      const highlighted = path.length === 0 || path.includes(parentId) && path.includes(childId)

      if (highlighted) {
        element.alpha = 1
        continue
      }

      element.alpha = config.styles.nodeUnselectedAlpha
    }
  }

  function getDependencyPathIds(nodeId: string): string[] {
    const parents = getAllSiblingIds(nodeId, 'parents')
    const children = getAllSiblingIds(nodeId, 'children')

    return [nodeId, ...parents, ...children]
  }

  function getAllSiblingIds(nodeId: string, direction: 'parents' | 'children'): string[] {
    const node = graphData?.nodes.get(nodeId)

    if (!node) {
      return []
    }

    const ids = []

    for (const { id } of node[direction]) {
      ids.push(id)
      ids.push(...getAllSiblingIds(id, direction))
    }

    return ids
  }

  return {
    element: container,
    stopWorker,
    getSize,
    render,
  }
}