export type Pixels = { x: number, y: number }
export type VerticalMode = 'waterfall' | 'nearest-parent'
export type HorizontalMode = 'trace' | 'dependency'

export type NodeSize = {
  height: number,
  width: number,
}

export type LayoutSettings = {
  horizontal: HorizontalMode,
  vertical: VerticalMode,
  horizontalScale: number,
  isTrace: () => boolean,
  isDependency: () => boolean,
  isWaterfall: () => boolean,
  isNearestParent: () => boolean,
}

export type NodeWidths = Map<string, number>

export type NodeLayoutResponse = {
  x: number,
  y: number,
  column: number,
  row: number,
}

export type NodesLayoutResponse = {
  maxRow: number,
  maxColumn: number,
  positions: Map<string, NodeLayoutResponse>,
}