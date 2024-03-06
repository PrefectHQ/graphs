import { ColorSource } from 'pixi.js'
import { RunGraphArtifact, RunGraphEvent } from '@/models'
import { GraphItemSelection } from '@/models/selection'
import { RunGraphStateEvent, StateType } from '@/models/states'
import { ViewportDateRange } from '@/models/viewport'

export type RunGraphProps = {
  config: RunGraphConfig,
  viewport?: ViewportDateRange,
  fullscreen?: boolean | null,
  selected?: GraphItemSelection | null,
}

export type RunGraphData = {
  root_node_ids: string[],
  start_time: Date,
  end_time: Date | null,
  nodes: RunGraphNodes,
  artifacts?: RunGraphArtifact[],
  states?: RunGraphStateEvent[],
  events?: RunGraphEvent[],
}

export type RunGraphNodes = Map<string, RunGraphNode>

export type RunGraphNode = {
  kind: RunGraphNodeKind,
  id: string,
  label: string,
  state_type: StateType,
  start_time: Date,
  end_time: Date | null,
  parents: RunGraphEdge[],
  children: RunGraphEdge[],
  artifacts?: RunGraphArtifact[],
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
export type RunGraphFetchEvents = (runId: string) => RunGraphEvent[] | Promise<RunGraphEvent[]>

export type RunGraphNodeStyles = {
  background?: ColorSource,
}

export type RunGraphStateStyles = {
  background?: ColorSource,
}

export type RunGraphStyles = {
  colorMode: 'dark' | 'light',
  rowGap?: number,
  columnGap?: number,
  textDefault?: ColorSource,
  textInverse?: ColorSource,
  selectedBorderColor?: ColorSource,
  selectedBorderWidth?: number,
  selectedBorderOffset?: number,
  selectedBorderRadius?: number,
  nodesPadding?: number,
  nodeHeight?: number,
  nodePadding?: number,
  nodeRadius?: number,
  nodeBorderRadius?: number,
  nodeToggleBgColor?: ColorSource,
  nodeToggleSize?: number,
  nodeToggleBorderRadius?: number,
  nodeToggleBorderColor?: ColorSource,
  nodeUnselectedAlpha?: number,
  edgeColor?: ColorSource,
  artifactsGap?: number,
  artifactsNodeOverlap?: number,
  artifactPaddingLeft?: number,
  artifactPaddingRight?: number,
  artifactPaddingY?: number,
  artifactTextColor?: ColorSource,
  artifactBgColor?: ColorSource,
  artifactBorderRadius?: number,
  artifactContentGap?: number,
  artifactIconSize?: number,
  artifactIconColor?: ColorSource,
  flowStateBarHeight?: number,
  flowStateSelectedBarHeight?: number,
  flowStateAreaAlpha?: number,
  eventTargetSize?: number,
  eventSelectedBorderInset?: number,
  eventRadiusDefault?: number,
  eventColor?: ColorSource,
  eventClusterRadiusDefault?: number,
  eventClusterColor?: ColorSource,
  guideLineWidth?: number,
  guideLineColor?: ColorSource,
  guideTextTopPadding?: number,
  guideTextLeftPadding?: number,
  guideTextSize?: number,
  guideTextColor?: ColorSource,
  playheadWidth?: number,
  playheadColor?: ColorSource,
  node?: (node: RunGraphNode) => RunGraphNodeStyles,
  state?: (state: RunGraphStateEvent) => RunGraphStateStyles,
}

export type RunGraphConfig = {
  runId: string,
  fetch: RunGraphFetch,
  fetchEvents?: RunGraphFetchEvents,
  animationDuration?: number,
  styles?: RunGraphStyles,
  disableAnimationsThreshold?: number,
  disableEdgesThreshold?: number,
}

export type RequiredGraphConfig = Omit<Required<RunGraphConfig>, 'styles'> & {
  styles: Required<RunGraphStyles>,
}