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
