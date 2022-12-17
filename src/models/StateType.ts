export const stateType = [
  'completed',
  'running',
  'scheduled',
  'pending',
  'failed',
  'cancelled',
  'crashed',
  'paused',
] as const

export type StateType = typeof stateType[number]
