import { RunGraphNode, Artifact } from '@/models'

export type NodeSelection = {
  id: string,
  kind: RunGraphNode['kind'],
}

export type ArtifactSelection = {
  kind: 'artifact',
  id: string,
}

export type GraphItemSelection = NodeSelection | ArtifactSelection

export type SelectableItem = RunGraphNode | Artifact