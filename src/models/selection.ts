import { RunGraphNode, RunGraphNodeKind, runGraphNodeKinds } from '@/models'

export type NodeSelection = {
  kind: RunGraphNode['kind'],
  id: string,
}
export function isNodeSelection(selection: GraphItemSelection): selection is NodeSelection {
  return runGraphNodeKinds.includes(selection.kind as RunGraphNodeKind)
}

export type ArtifactSelection = {
  kind: 'artifact',
  id: string,
}
export function isArtifactSelection(selection: GraphItemSelection): selection is ArtifactSelection {
  return selection.kind === 'artifact'
}

export type ArtifactClusterSelection = {
  kind: 'artifactCluster',
  ids: string[],
}
export function isArtifactClusterSelection(selection: GraphItemSelection): selection is ArtifactClusterSelection {
  return selection.kind === 'artifactCluster'
}

export type GraphItemSelection =
  | NodeSelection
  | ArtifactSelection
  | ArtifactClusterSelection