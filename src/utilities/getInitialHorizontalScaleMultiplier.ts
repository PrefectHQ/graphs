import { differenceInSeconds, secondsInHour } from 'date-fns'
import { RunGraphData } from '@/models/RunGraph'

export function getInitialHorizontalScaleMultiplier({ start_time, end_time }: RunGraphData): number {
  const seconds = differenceInSeconds(end_time ?? new Date(), start_time)

  if (seconds < secondsInHour) {
    return 2
  }

  if (seconds < secondsInHour * 6) {
    return 1
  }

  return 0.1
}