export const stateType = [
  'COMPLETED',
  'RUNNING',
  'SCHEDULED',
  'PENDING',
  'FAILED',
  'CANCELLED',
  'CANCELLING',
  'CRASHED',
  'PAUSED',
] as const

export type StateType = typeof stateType[number]

export type StateEvent = {
  id: string,
  occurred: Date,
  type: StateType,
  from: StateType | null,
}