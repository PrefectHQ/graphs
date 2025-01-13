import { ColorSource } from 'pixi.js'
import { ViewportDateRange } from '@/models/viewport'

export type NodePosition = 'inline' | 'floating-top' | 'floating-bottom'
export type EventPosition = 'top' | 'bottom' | 'left' | 'right' | 'floating-top' | 'floating-bottom'

export type GraphData = {
  start: Date,
  end: Date | null,
  rootNodeIds: string[],
  nodes: Map<string, GraphNode>,
  events: Map<string, GraphEvent>,
}

export type GraphProps = {
  config: GraphConfig,
  data: GraphData,
  viewport?: ViewportDateRange,
}

export type GraphEvent = {
  id: string,
  occurred: Date,
  attributes: Record<string, unknown>,
}

export type GraphEdge = {
  id: string,
  attributes: Record<string, unknown>,
}

export type GraphNode = {
  id: string,
  start: Date,
  end: Date | null,
  parents: GraphEdge[],
  children: GraphEdge[],
  data?: GraphData,
  attributes: Record<string, unknown>,
}

export type GraphEdgeStyles = {
  color?: ColorSource,
  label?: string,
}

export type GraphEventStyles = {
  background?: ColorSource,
  label?: string,
  position?: EventPosition,
}

export type GraphNodeStyles = {
  background?: ColorSource,
  border?: ColorSource,
  label?: string,
  position?: NodePosition,
}

export type GraphStyles = {
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
  nodePosition?: NodePosition,
  nodeUnselectedAlpha?: number,
  eventTargetSize?: number,
  eventSize?: number,
  eventMargin?: number,
  eventPosition?: EventPosition,
  eventSelectedBorderInset?: number,
  eventRadiusDefault?: number,
  eventColor?: ColorSource,
  eventClusterRadiusDefault?: number,
  eventClusterColor?: ColorSource,
  edgeColor?: ColorSource,
  guideLineWidth?: number,
  guideLineColor?: ColorSource,
  guideTextTopPadding?: number,
  guideTextLeftPadding?: number,
  guideTextSize?: number,
  guideTextColor?: ColorSource,
  playheadWidth?: number,
  playheadColor?: ColorSource,
  node?: (node: GraphNode) => GraphNodeStyles,
  event?: (event: GraphEvent) => GraphEventStyles,
  edge?: (edge: GraphEdge) => GraphEdgeStyles,
}

export type GraphConfig = {
  id: string,
  animationDuration?: number,
  styles?: GraphStyles,
  disableAnimationsThreshold?: number,
  disableEdgesThreshold?: number,
}

export type RequiredGraphConfig = Omit<Required<GraphConfig>, 'styles'> & {
  styles: Required<GraphStyles>,
}