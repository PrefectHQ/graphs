import { ColorSource } from 'pixi.js'
import { Artifact, Event } from '@/models'
import { GraphItemSelection } from '@/models/selection'
import { StateEvent, StateType } from '@/models/states'
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
  artifacts?: Artifact[],
  events?: Event[],
  state_events?: StateEvent[],
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
  artifacts?: Artifact[],
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
  flowStateAreaAlpha?: number,
  eventTargetSize?: number,
  eventRadiusDefault?: number,
  eventRadiusEventDefault?: number,
  eventColor?: ColorSource,
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
  state?: (state: StateEvent) => RunGraphStateStyles,
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