import { RunGraphNode, Artifact } from '@/models'

export type NodeSelection = {
  kind: RunGraphNode['kind'],
  id: string,
}

export type ArtifactSelection = {
  kind: 'artifact',
  id: string,
}

export type ArtifactClusterSelection = {
  kind: 'artifactCluster',
  ids: string[],
}

export type GraphItemSelection =
  | NodeSelection
  | ArtifactSelection
  | ArtifactClusterSelection

export type SelectableItem = RunGraphNode | Artifact | string[]