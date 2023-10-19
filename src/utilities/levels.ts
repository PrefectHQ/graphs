import { RunGraphNodes } from '@/models/RunGraph'

// Map<nodeId, level>
export type NodeLevels = Map<string, number>

export function getLevels(nodeIds: string[], nodes: RunGraphNodes, levels: NodeLevels = new Map()): NodeLevels {
  nodeIds.forEach(nodeId => {
    if (levels.has(nodeId)) {
      return
    }

    const node = nodes.get(nodeId)

    if (!node) {
      throw new Error('Node id not found in nodes')
    }

    const parentLevels = node.parents.map(({ id }) => getLevel(id, nodes, levels))
    const maxParentLevel = Math.max(...parentLevels)

    if (maxParentLevel >= 0) {
      levels.set(nodeId, maxParentLevel + 1)
    } else {
      levels.set(nodeId, 0)
    }

    const childNodeIds = node.children.map(({ id }) => id)

    if (childNodeIds.length) {
      getLevels(childNodeIds, nodes, levels)
    }
  })

  return levels
}

function getLevel(id: string, nodes: RunGraphNodes, levels: NodeLevels): number {
  const level = levels.get(id)

  if (level !== undefined) {
    return level
  }

  const parentLevels = getLevels([id], nodes, levels)

  const parentLevel = parentLevels.get(id)

  if (parentLevel === undefined) {
    throw new Error('Could not determine parent level')
  }

  return parentLevel
}