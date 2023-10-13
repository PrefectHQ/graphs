import { BitmapText, Container, Graphics, IPointData } from 'pixi.js'
import { GraphPreLayout, NodePostLayout, NodePreLayout } from '@/models/layout'
import { RunGraphNode, RunGraphNodes } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForFonts } from '@/objects/fonts'
import { waitForNodesContainer } from '@/objects/nodesContainer'
import { waitForScales } from '@/objects/scales'
import { centerViewport } from '@/objects/viewport'
import { axisBumpFactory } from '@/utilities/axisBumpFactory'
import { exhaustive } from '@/utilities/exhaustive'
import { graphDataFactory } from '@/utilities/graphDataFactory'
import { WorkerLayoutMessage, WorkerMessage, getLayoutWorker } from '@/workers/runGraph'

const { fetch: getData, stop: stopData } = graphDataFactory()

type NodeObjects = {
  nodeRenderKey: string,
  container: Container,
  label: BitmapText,
  box: Graphics,
}

const graphObjects = new Map<string, NodeObjects>()
const graphPreLayout: GraphPreLayout = new Map()
const bumps = axisBumpFactory()

// fake bump just to prove this works
bumps.set({ axis: 5, nodeId: 'foo', offset: 100 })

const worker = getLayoutWorker(onMessage)

function onMessage({ data }: MessageEvent<WorkerMessage>): void {
  const { type } = data

  switch (type) {
    case 'layout':
      handleLayoutMessage(data)
      return
    default:
      exhaustive(type)
  }
}

function handleLayoutMessage({ layout }: WorkerLayoutMessage): void {
  layout.forEach(async (layout, nodeId) => {
    const objects = graphObjects.get(nodeId)

    if (!objects) {
      console.warn(`Count not find ${nodeId} from layout in graph`)
      return
    }

    objects.container.position = await getActualPositionFromLayout(layout)
    objects.container.visible = true
  })

  centerViewport()
}

export async function startNodes(): Promise<void> {
  const config = await waitForConfig()

  getGraphData(config.runId)

  emitter.on('configUpdated', () => {
    stopNodes()
    startNodes()
  })
}

export function stopNodes(): void {
  graphObjects.clear()
  graphPreLayout.clear()
  bumps.clear()
  stopData()
}

function getGraphData(runId: string): void {
  getData(runId, async data => {
    await drawNodes(data.nodes)

    worker.postMessage({ type: 'layout', layout: graphPreLayout })
  })
}

async function drawNodes(nodes: RunGraphNodes): Promise<void> {
  const promises: Promise<void>[] = []

  nodes.forEach(node => {
    promises.push(drawNode(node))
  })

  await Promise.all(promises)
}

async function drawNode(node: RunGraphNode): Promise<void> {
  const config = await waitForConfig()
  const nodesContainer = await waitForNodesContainer()
  const nodeRenderKey = config.nodeRenderKey(node)
  const objects = graphObjects.get(node.id) ?? await createNode(node)
  const layout = await createNodePreLayout(node, objects)

  if (objects.nodeRenderKey !== nodeRenderKey) {
    await updateNode(node, objects)
  }

  graphObjects.set(node.id, objects)
  graphPreLayout.set(node.id, layout)

  nodesContainer.addChild(objects.container)
}

async function createNode(node: RunGraphNode): Promise<NodeObjects> {
  const existing = graphObjects.get(node.id)

  if (existing) {
    return existing
  }

  const config = await waitForConfig()
  const nodeRenderKey = config.nodeRenderKey(node)

  const box = await createNodeBox(node)
  const label = await createNodeLabel(node)
  const container = createContainer()

  label.position = await getLabelPositionRelativeToBox(label, box)

  container.addChild(box)
  container.addChild(label)

  const sprites: NodeObjects = {
    nodeRenderKey,
    container,
    label,
    box,
  }

  return sprites
}

async function updateNode(node: RunGraphNode, objects: NodeObjects): Promise<void> {
  const box = await updateNodeBox(node, objects.box)
  const label = updateNodeLabel(node, objects.label)

  label.position = await getLabelPositionRelativeToBox(label, box)
}

function createContainer(): Container {
  const container = new Container()

  container.eventMode = 'none'
  container.visible = false

  return container
}

async function createNodeBox(node: RunGraphNode): Promise<Graphics> {
  const graphics = new Graphics()

  return await updateNodeBox(node, graphics)
}

async function updateNodeBox(node: RunGraphNode, box: Graphics): Promise<Graphics> {
  box.clear()

  const config = await waitForConfig()
  const { scaleX } = await waitForScales()
  const { background } = config.styles.node(node)

  const boxLeft = scaleX(node.start_time)
  const boxRight = scaleX(node.end_time ?? new Date())
  const boxWidth = boxRight - boxLeft
  const boxHeight = config.styles.nodeHeight - config.styles.nodeMargin * 2

  box.lineStyle(1, 0x0, 1, 2)
  box.beginFill(background)
  box.drawRoundedRect(0, 0, boxWidth, boxHeight, 4)
  box.endFill()

  return box
}

async function createNodeLabel(node: RunGraphNode): Promise<BitmapText> {
  const { inter } = await waitForFonts()

  const label = inter(node.label, {
    fontSize: 12,
  })

  return label
}

function updateNodeLabel(node: RunGraphNode, label: BitmapText): BitmapText {
  label.text = node.label

  return label
}

async function getLabelPositionRelativeToBox(label: BitmapText, box: Graphics): Promise<IPointData> {
  const config = await waitForConfig()

  // todo: this should probably be nodePadding
  const margin = config.styles.nodeMargin
  const inside = box.width > margin + label.width + margin
  // todo: this doesn't look quite right
  const y = box.height / 2 - label.height / 2

  if (inside) {
    return {
      x: margin,
      y,
    }
  }

  return {
    x: box.width + margin,
    y,
  }
}

async function createNodePreLayout(node: RunGraphNode, { container }: NodeObjects): Promise<NodePreLayout> {
  const { scaleX } = await waitForScales()

  const x = scaleX(node.start_time)
  const { width } = container
  const { parents, children } = node

  return {
    x,
    width,
    parents,
    children,
  }
}

async function getActualPositionFromLayout({ x, y }: NodePostLayout): Promise<IPointData> {
  const config = await waitForConfig()
  const yValue = y * config.styles.nodeHeight
  const bump = bumps.bump(y)

  return {
    x,
    y: yValue + bump,
  }
}