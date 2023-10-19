import { RunGraphNodes } from '@/models/RunGraph'

// Map<nodeId, column>
export type NodeColumns = Map<string, number>

export function getColumns(nodeIds: string[], nodes: RunGraphNodes, columns: NodeColumns = new Map()): NodeColumns {
  nodeIds.forEach(nodeId => {
    if (columns.has(nodeId)) {
      return
    }

    const node = nodes.get(nodeId)

    if (!node) {
      throw new Error('Node id not found in nodes')
    }

    const parentColumns = node.parents.map(({ id }) => getColumn(id, nodes, columns))
    const maxParentColumn = Math.max(...parentColumns)

    if (maxParentColumn >= 0) {
      columns.set(nodeId, maxParentColumn + 1)
    } else {
      columns.set(nodeId, 0)
    }

    const childNodeIds = node.children.map(({ id }) => id)

    if (childNodeIds.length) {
      getColumns(childNodeIds, nodes, columns)
    }
  })

  return columns
}

function getColumn(id: string, nodes: RunGraphNodes, columns: NodeColumns): number {
  const column = columns.get(id)

  if (column !== undefined) {
    return column
  }

  const parentColumns = getColumns([id], nodes, columns)

  const parentColumn = parentColumns.get(id)

  if (parentColumn === undefined) {
    throw new Error('Could not determine parent column')
  }

  return parentColumn
}