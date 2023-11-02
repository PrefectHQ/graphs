import { ColorSource } from 'pixi.js'
import { NodeSelection } from '@/models/selection'
import { StateType } from '@/models/states'
import { ViewportDateRange } from '@/models/viewport'

export type RunGraphProps = {
  config: RunGraphConfig,
  viewport?: ViewportDateRange,
  fullscreen?: boolean | null,
  selected?: NodeSelection | null,
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
  rowGap?: number,
  columnGap?: number,
  nodesPadding?: number,
  nodeHeight?: number,
  nodePadding?: number,
  nodeRadius?: number,
  nodeBorderRadius?: number,
  nodeToggleSize?: number,
  nodeToggleBorderRadius?: number,
  nodeToggleBorderColor?: ColorSource,
  nodeSelectedBorderColor?: ColorSource,
  edgeColor?: string,
  guideLineWidth?: number,
  guideLineColor?: string,
  guideTextTopPadding?: number,
  guideTextLeftPadding?: number,
  guideTextSize?: number,
  guideTextColor?: string,
  node?: (node: RunGraphNode) => RunGraphNodeStyles,
}

export type RunGraphConfig = {
  runId: string,
  fetch: RunGraphFetch,
  animationDuration?: number,
  styles?: RunGraphStyles,
  disableAnimationsThreshold?: number,
  disableEdgesThreshold?: number,
}

export type RequiredGraphConfig = Omit<Required<RunGraphConfig>, 'styles'> & {
  styles: Required<RunGraphStyles>,
}