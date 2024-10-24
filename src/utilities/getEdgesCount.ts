import { GraphNode } from '@/models/Graph'

export function getEdgesCount(nodes: Map<string, GraphNode>): number {
  let numberOfEdges = 0

  for (const [, { children }] of nodes) {
    numberOfEdges += children.length
  }

  return numberOfEdges
}