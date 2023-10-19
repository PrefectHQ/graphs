export type Pixels = { x: number, y: number }
export type VerticalMode = 'waterfall' | 'nearest-parent'
export type HorizontalMode = 'trace' | 'dependency'

export type LayoutMode = {
  horizontal: HorizontalMode,
  vertical: VerticalMode,
}

export type NodeWidths = Map<string, number>

export type NodeLayoutResponse = Map<string, {
  x: number,
  y: number,
}>