import { horizontalScaleFactory } from '@/factories/position'
import { NodeLayoutResponse } from '@/models/layout'
import { RunGraphNodes } from '@/models/RunGraph'
import { exhaustive } from '@/utilities/exhaustive'
import { WorkerMessage, ClientMessage, ClientLayoutMessage } from '@/workers/runGraph'

onmessage = onMessageHandler

function onMessageHandler({ data }: MessageEvent<ClientMessage>): void {
  const { type } = data

  switch (type) {
    case 'layout':
      handleLayoutMessage(data)
      return
    default:
      exhaustive(type)
  }
}

function post(message: WorkerMessage): void {
  postMessage(message)
}

function handleLayoutMessage(message: ClientLayoutMessage): void {
  let y = 0
  const { data } = message
  const horizontal = getHorizontalLayout(message)
  const layout: NodeLayoutResponse = new Map()

  data.nodes.forEach((node, nodeId) => {
    const x = horizontal.get(nodeId)

    if (x === undefined) {
      console.warn(`NodeId not found in horizontal layout: Skipping ${node.label}`)
      return
    }

    layout.set(nodeId, {
      x,
      y: y++,
    })
  })

  post({
    type: 'layout',
    layout,
  })
}

type HorizontalLayout = Map<string, number>

function getHorizontalLayout(message: ClientLayoutMessage): HorizontalLayout {
  if (message.settings.mode === 'dependency') {
    return getHorizontalDependencyLayout(message)
  }

  return getHorizontalTimeLayout(message)
}

function getHorizontalDependencyLayout({ data, settings }: ClientLayoutMessage): HorizontalLayout {
  const levels = getLevels(data.root_node_ids, data.nodes)
  const scale = horizontalScaleFactory(settings)
  const layout: HorizontalLayout = new Map()

  data.nodes.forEach((node, nodeId) => {
    layout.set(nodeId, scale(levels.get(nodeId)!))
  })

  return layout
}

function getHorizontalTimeLayout({ data, settings }: ClientLayoutMessage): HorizontalLayout {
  const scale = horizontalScaleFactory(settings)
  const layout: HorizontalLayout = new Map()

  data.nodes.forEach((node, nodeId) => {
    layout.set(nodeId, scale(node.start_time))
  })

  return layout
}

// Map<nodeId, level>
type NodeLevels = Map<string, number>

function getLevels(nodeIds: string[], nodes: RunGraphNodes, levels: NodeLevels = new Map()): NodeLevels {
  nodeIds.forEach(nodeId => {
    if (levels.has(nodeId)) {
      return
    }

    const node = nodes.get(nodeId)

    if (!node) {
      throw new Error('Node id not found in nodes')
    }

    const parentLevels = node.parents.map(({ id }) => levels.get(id) ?? 0)

    // -1 so that maxParentLevel + 1 is always at least 0
    const maxParentLevel = Math.max(...parentLevels, -1)

    levels.set(nodeId, maxParentLevel + 1)

    const childNodeIds = node.children.map(({ id }) => id)

    if (childNodeIds.length) {
      getLevels(childNodeIds, nodes, levels)
    }
  })

  return levels
}