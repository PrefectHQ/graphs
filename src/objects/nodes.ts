import { BitmapText, Graphics } from 'pixi.js'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForFonts } from '@/objects/fonts'
import { waitForNodesContainer } from '@/objects/nodesContainer'
import { waitForScales } from '@/objects/scales'
import { centerViewport } from '@/objects/viewport'
import { graphDataFactory } from '@/utilities/graphDataFactory'

const { fetch: getData, stop: stopData } = graphDataFactory()

type NodeSprites = {
  graphics: Graphics,
  label: BitmapText,
}

const nodes = new Map<string, NodeSprites>()

// dummy offset for now
let yOffset = 0

export async function startNodes(): Promise<void> {
  const config = await waitForConfig()

  getGraphData(config.runId)

  emitter.on('configUpdated', config => getGraphData(config.runId))
}

export function stopNodes(): void {
  nodes.clear()
  yOffset = 0
  stopData()
}


function getGraphData(runId: string): void {
  getData(runId, async data => {
    const promises: Promise<void>[] = []

    data.nodes.forEach(node => {
      promises.push(renderNode(node))
    })

    // once we get to "running" runs we'll want to only do this on the first load
    await Promise.all(promises)
    centerViewport()
  })
}

async function renderNode(node: RunGraphNode): Promise<void> {
  const config = await waitForConfig()
  const { scaleX, scaleY } = await waitForScales()
  const { graphics, label } = nodes.get(node.id) ?? await createNode(node)
  const { nodeMargin: margin } = config.styles
  const { background } = config.styles.node(node)

  graphics.clear()

  const offset = yOffset++
  const x = scaleX(node.start_time)
  const y = scaleY(offset) + margin
  const width = scaleX(node.end_time ?? new Date()) - x
  const height = scaleY(offset + 1) - y - margin

  // graphics.lineStyle(1, 0x0, 1, 2)
  graphics.beginFill(background)
  graphics.drawRoundedRect(0, 0, width, height, 4)
  graphics.endFill()

  graphics.width = Math.max(width, 1)

  graphics.position.set(x, y)
  label.position.set(x + width + margin, y)
}

async function createNode(node: RunGraphNode): Promise<NodeSprites> {
  const container = await waitForNodesContainer()
  const { inter } = await waitForFonts()
  const graphics = new Graphics()

  const label = inter(node.label, {
    fontSize: 12,
  })

  nodes.set(node.id, {
    graphics,
    label,
  })


  container.addChild(graphics)
  container.addChild(label)

  return {
    graphics,
    label,
  }
}