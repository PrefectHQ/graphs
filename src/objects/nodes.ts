import { BitmapText, Container, Graphics } from 'pixi.js'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { emitter, waitForEvent } from '@/objects/events'
import { waitForFonts } from '@/objects/fonts'
import { waitForScales } from '@/objects/scales'
import { waitForViewport } from '@/objects/viewport'
import { graphDataFactory } from '@/utilities/graphDataFactory'

const { fetch: getData, stop: stopData } = graphDataFactory()

type NodeSprites = {
  graphics: Graphics,
  label: BitmapText,
}

const nodes = new Map<string, NodeSprites>()
let container: Container | null = null

// dummy offset for now
let yOffset = 0

export async function startNodes(): Promise<void> {
  await startContainer()
  const config = await waitForConfig()

  getGraphData(config.runId)

  emitter.on('configUpdated', config => getGraphData(config.runId))
}

export function stopNodes(): void {
  stopContainer()
  nodes.clear()
  yOffset = 0
  stopData()
}

export async function waitForContainer(): Promise<Container> {
  if (container) {
    return container
  }

  return await waitForEvent('containerCreated')
}

async function startContainer(): Promise<void> {
  const viewport = await waitForViewport()
  container = new Container()

  viewport.addChild(container)

  emitter.emit('containerCreated', container)
}

function stopContainer(): void {
  container = null
}

function getGraphData(runId: string): void {
  getData(runId, data => {
    data.nodes.forEach(node => renderNode(node))
  })
}

async function renderNode(node: RunGraphNode): Promise<void> {
  const config = await waitForConfig()
  const { scaleX, scaleY } = await waitForScales()
  const { graphics, label } = nodes.get(node.id) ?? await createNode(node)
  const { background } = config.styles.node(node)

  graphics.clear()

  const offset = yOffset++
  const x = scaleX(node.start_time)
  const y = scaleY(offset)
  const width = scaleX(node.end_time ?? new Date()) - x
  const height = scaleY(offset + 1) - y

  // graphics.lineStyle(1, 0x0, 1, 2)
  graphics.beginFill(background)
  graphics.drawRoundedRect(0, 0, width, height, 4)
  graphics.endFill()

  graphics.width = Math.max(width, 1)

  graphics.position.set(x, y)
  label.position.set(x, y)
}

async function createNode(node: RunGraphNode): Promise<NodeSprites> {
  const { inter } = await waitForFonts()
  const graphics = new Graphics()

  const label = inter(node.label, {
    fontSize: 12,
  })

  nodes.set(node.id, {
    graphics,
    label,
  })

  container!.addChild(graphics)
  container!.addChild(label)

  return {
    graphics,
    label,
  }
}