export type Pixels = { x: number, y: number }
export type VerticalMode = 'waterfall' | 'nearest-parent'
export type HorizontalMode = 'trace' | 'dependency'

export type NodeSize = {
  height: number,
}

export type LayoutMode = {
  horizontal: HorizontalMode,
  vertical: VerticalMode,
}

export type NodeWidths = Map<string, number>

export type NodeLayoutResponse = {
  x: number,
  y: number,
  width: number,
}

export type NodesLayoutResponse = Map<string, NodeLayoutResponse>