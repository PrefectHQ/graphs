import { RunGraphEdge } from '@/models/RunGraph'

export type NodePreLayout = {
  x: number,
  parents: RunGraphEdge[],
  children: RunGraphEdge[],
  width: number,
}

export type GraphPreLayout = Map<string, NodePreLayout>

export type NodePostLayout = NodePreLayout & {
  y: number,
}

export type GraphPostLayout = Map<string, NodePostLayout>