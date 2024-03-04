import { RunGraphNode, RunGraphNodeKind, runGraphNodeKinds, RunGraphStateEvent } from '@/models'

export type GraphSelectionPosition = {
  x: number,
  y: number,
  width: number,
  height: number,
}

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

export type ArtifactsSelection = {
  kind: 'artifacts',
  ids: string[],
  position?: GraphSelectionPosition,
}
export function isArtifactsSelection(selection: GraphItemSelection): selection is ArtifactsSelection {
  return selection.kind === 'artifacts'
}

export interface StateSelection extends RunGraphStateEvent {
  kind: 'state',
  position?: GraphSelectionPosition,
}
export function isStateSelection(selection: GraphItemSelection): selection is StateSelection {
  return selection.kind === 'state'
}

export type GraphItemSelection =
  | NodeSelection
  | ArtifactSelection
  | ArtifactsSelection
  | StateSelection