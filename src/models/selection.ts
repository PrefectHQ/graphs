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

export type ArtifactsSelection = {
  kind: 'artifacts',
  ids: string[],
}
export function isArtifactsSelection(selection: GraphItemSelection): selection is ArtifactsSelection {
  return selection.kind === 'artifacts'
}

export type EventSelection = {
  kind: 'event',
  id: string,
}
export function isEventSelection(selection: GraphItemSelection): selection is EventSelection {
  return selection.kind === 'event'
}

export type EventsSelection = {
  kind: 'events',
  ids: string[],
}
export function isEventsSelection(selection: GraphItemSelection): selection is EventsSelection {
  return selection.kind === 'events'
}

export type GraphItemSelection =
  | NodeSelection
  | ArtifactSelection
  | ArtifactsSelection
  | EventSelection
  | EventsSelection