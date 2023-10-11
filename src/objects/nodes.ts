import { BitmapText, Container, Graphics, IPointData } from 'pixi.js'
import { RunGraphNode, RunGraphNodes } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForFonts } from '@/objects/fonts'
import { waitForNodesContainer } from '@/objects/nodesContainer'
import { waitForScales } from '@/objects/scales'
import { graphDataFactory } from '@/utilities/graphDataFactory'

const { fetch: getData, stop: stopData } = graphDataFactory()

type NodeSprites = {
  nodeRenderKey: string,
  container: Container,
  label: BitmapText,
  box: Graphics,
}

const nodeSprites = new Map<string, NodeSprites>()

export async function startNodes(): Promise<void> {
  const config = await waitForConfig()

  getGraphData(config.runId)

  emitter.on('configUpdated', () => {
    stopNodes()
    startNodes()
  })
}

export function stopNodes(): void {
  nodeSprites.clear()
  stopData()
}

async function getGraphData(runId: string): Promise<void> {
  const nodesContainer = await waitForNodesContainer()

  getData(runId, async data => {
    await drawNodes(data.nodes)

    // todo: calculate layout in worker after the nodes are drawn

    nodeSprites.forEach(({ container }) => {

      // this is just a wrong type IMO. there's no guarantee any pixi object has a parent
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!container.parent) {
        nodesContainer.addChild(container)
      }
    })

    // centerViewport()
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
  const nodeRenderKey = config.nodeRenderKey(node)
  const sprites = nodeSprites.get(node.id) ?? await createNode(node)

  if (sprites.nodeRenderKey !== nodeRenderKey) {
    await updateNode(node, sprites)
  }

  nodeSprites.set(node.id, sprites)
}

async function createNode(node: RunGraphNode): Promise<NodeSprites> {
  const existing = nodeSprites.get(node.id)

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

  const sprites: NodeSprites = {
    nodeRenderKey,
    container,
    label,
    box,
  }

  return sprites
}

async function updateNode(node: RunGraphNode, sprites: NodeSprites): Promise<void> {
  const box = await updateNodeBox(node, sprites.box)
  const label = updateNodeLabel(node, sprites.label)

  label.position = await getLabelPositionRelativeToBox(label, box)
}

function createContainer(): Container {
  const container = new Container()

  container.eventMode = 'none'

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