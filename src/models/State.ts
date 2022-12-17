import { StateDetails } from './StateDetails'
import { StateType } from './StateType'

export type State = {
  id: string,
  type: StateType,
  message: string,
  stateDetails: StateDetails | null,
  data: Record<string, unknown>,
  timestamp: string,
  name: string,
}
