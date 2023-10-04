import { UseSubscription, useSubscription } from '@prefecthq/vue-compositions'
import { Graphics } from 'pixi.js'
import { watch } from 'vue'
import { RunGraphConfig, RunGraphFetch, RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScales } from '@/objects/scales'
import { waitForViewport } from '@/objects/viewport'
import { effectScopeFactory } from '@/utilities/effectScope'

let subscription: UseSubscription<RunGraphFetch> | null = null

const scope = effectScopeFactory()
const nodes = new Map<string, Graphics>()
let yOffset = 1

export async function startNodes(): Promise<void> {
  const config = await waitForConfig()

  startSubscription(config)

  emitter.on('configUpdated', startSubscription)
}

export function stopNodes(): void {
  stopSubscription()
  nodes.clear()
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

function startSubscription({ fetch, runId }: RunGraphConfig): void {
  scope.run(() => {
    stopSubscription()

    // todo: need to account for an interval for running states
    // I think I can just pass in an empty but reactive set of options
    // and then update with the correct interval once the initial response is received
    subscription = useSubscription(fetch, [runId])

    watch(() => subscription?.response, response => {
      response?.nodes.forEach(node => renderNode(node))
    }, { immediate: true })
  })
}

function stopSubscription(): void {
  scope.stop()
  subscription = null
}