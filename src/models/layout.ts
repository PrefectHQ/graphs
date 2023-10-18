import { RunGraphNode } from '@/models/RunGraph'

export type Pixels = { x: number, y: number }
export type VerticalMode = 'waterfall' | 'nearest-parent'
export type HorizontalMode = 'time' | 'dat'
export type LayoutMode = {
  horizontal: HorizontalMode,
  vertical: VerticalMode,
}

export type NodeLayoutRequest = Map<string, {
  node: RunGraphNode,
  width: number,
}>

export type NodeLayoutResponse = Map<string, {
  x: number,
  y: number,
}>