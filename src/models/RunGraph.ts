import { ColorSource } from 'pixi.js'
import { DeepRequired } from 'ts-essentials'
import { StateType } from '@/models/states'
import { ScaleXDomain } from '@/objects'

export type RunGraphProps = {
  config: RunGraphConfig,
  viewport?: ScaleXDomain,
}

export type RunGraphData = {
  root_node_ids: string[],
  start_time: Date,
  end_time: Date | null,
  nodes: RunGraphNodes,
}

export type RunGraphNodes = Map<string, RunGraphNode>

export type RunGraphNode = {
  kind: RunGraphNodeKind,
  id: string,
  label: string,
  state_name: string,
  state_type: StateType,
  start_time: Date,
  end_time: Date | null,
  parents: RunGraphEdge[],
  children: RunGraphEdge[],
}

export type RunGraphEdge = {
  id: string,
}

export const runGraphNodeKinds = ['flow-run', 'task-run'] as const
export type RunGraphNodeKind = typeof runGraphNodeKinds[number]

export function isRunGraphNodeType(value: unknown): value is RunGraphNodeKind {
  return runGraphNodeKinds.includes(value as RunGraphNodeKind)
}

export type RunGraphFetch = (runId: string) => RunGraphData | Promise<RunGraphData>

export type RunGraphNodeStyles = {
  background?: ColorSource,
}

export type RunGraphStyles = {
  nodeHeight?: number,
  nodeMargin?: number,
  node?: (node: RunGraphNode) => RunGraphNodeStyles,
}

export type RunGraphConfig = {
  runId: string,
  fetch: RunGraphFetch,
  animationDuration?: number,
  nodeRenderKey?: (node: RunGraphNode) => string,
  styles?: RunGraphStyles,
}

export type RequiredGraphConfig = DeepRequired<RunGraphConfig> & {
  nodeRenderKey: (node: RunGraphNode) => string,
  styles: {
    node: (node: RunGraphNode) => Required<RunGraphNodeStyles>,
  },
}