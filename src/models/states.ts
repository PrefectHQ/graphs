export const stateType = [
  'completed',
  'running',
  'scheduled',
  'pending',
  'failed',
  'cancelled',
  'cancelling',
  'crashed',
  'paused',
] as const

export type StateType = typeof stateType[number]