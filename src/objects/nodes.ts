import { Graphics } from 'pixi.js'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScales } from '@/objects/scales'
import { waitForViewport } from '@/objects/viewport'
import { graphDataFactory } from '@/utilities/graphDataFactory'

const { fetch: getData, stop: stopData } = graphDataFactory()
const nodes = new Map<string, Graphics>()

// dummy offset for now
let yOffset = 1

export async function startNodes(): Promise<void> {
  const config = await waitForConfig()

  getGraphData(config.runId)

  emitter.on('configUpdated', config => getGraphData(config.runId))
}

export function stopNodes(): void {
  nodes.clear()
  stopData()
}

function getGraphData(runId: string): void {
  getData(runId, data => {
    data.nodes.forEach(node => renderNode(node))
  })
}

async function renderNode(node: RunGraphNode): Promise<void> {
  const { scaleX, scaleY } = await waitForScales()
  const graphics = nodes.get(node.id) ?? await createNode(node.id)

  graphics.clear()

  const offset = yOffset++
  const x = scaleX(node.start_time)
  const y = scaleY(offset)
  const width = scaleX(node.end_time ?? new Date()) - x
  const height = scaleY(offset + 10) - y

  graphics.beginFill(0x3e494b)
  graphics.lineStyle(1, 0x0, 1, 2)
  graphics.drawRoundedRect(x, y, width, height, 8)
  graphics.endFill()

  graphics.width = Math.max(width, 1)
}

async function createNode(nodeId: string): Promise<Graphics> {
  const viewport = await waitForViewport()
  const graphics = new Graphics()

  nodes.set(nodeId, graphics)

  viewport.addChild(graphics)

  return graphics
}