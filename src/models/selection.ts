import { RunGraphNode } from '@/models/RunGraph'

export type NodeSelection = {
  id: string,
  kind: RunGraphNode['kind'],
}