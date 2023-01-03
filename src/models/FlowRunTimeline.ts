import { IBitmapTextStyle } from 'pixi.js'

export type TimelineNodeState =
  'completed'
  |'running'
  |'scheduled'
  |'pending'
  |'failed'
  |'cancelled'
  |'crashed'
  |'paused'

export type TimelineNodeData = {
  id: string,
  label: string,
  start: Date,
  end: Date | null,
  upstreamDependencies?: TimelineNodeData[],
  state: TimelineNodeState | string,
}

export type TextStyles = {
  nodeTextDefault: Partial<IBitmapTextStyle>,
  nodeTextInverse: Partial<IBitmapTextStyle>,
  timeMarkerLabel: Partial<IBitmapTextStyle>,
}
