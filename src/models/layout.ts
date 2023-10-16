import { RunGraphEdge } from '@/models/RunGraph'

export type Position = { x: number | Date, y: number }
export type Pixels = { x: number, y: number }

export type SetVerticalModeWaterfallParameters = {
  mode: 'waterfall',
  rowHeight: number,
}

export type SetVerticalModeNearestParentParameters = {
  mode: 'nearest-parent',
  rowHeight: number,
}

export type SetVerticalModeParameters = SetVerticalModeWaterfallParameters | SetVerticalModeNearestParentParameters

export type VerticalMode = SetVerticalModeParameters['mode']

export type SetHorizontalModeParameters = SetHorizontalModeTimeParameters | SetHorizontalModeLinearParameters

export type SetHorizontalModeTimeParameters = {
  mode: 'time',
  startTime: Date,
}

export type SetHorizontalModeLinearParameters = {
  mode: 'dag',
}

export type HorizontalMode = SetHorizontalModeParameters['mode']

export type NodePreLayout = {
  x: number,
  parents: RunGraphEdge[],
  children: RunGraphEdge[],
  width: number,
}

export type GraphPreLayout = Map<string, NodePreLayout>

export type NodePostLayout = NodePreLayout & {
  y: number,
}

export type GraphPostLayout = Map<string, NodePostLayout>

export type LayoutMode = {
  horizontal: HorizontalMode,
  vertical: VerticalMode,
}