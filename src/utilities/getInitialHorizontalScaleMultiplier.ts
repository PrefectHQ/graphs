import { differenceInSeconds } from 'date-fns'
import { RunGraphData } from '@/models/RunGraph'

const minimumScale = 0.01
const maximumScale = 20

export function getInitialHorizontalScaleMultiplier({ start_time, end_time, nodes }: RunGraphData, aspectRatio: number): number {
  const seconds = differenceInSeconds(end_time ?? new Date(), start_time)

  // Smaller graphs need a greater multiplier. Most graphs this will be 1.
  const nodeMultiplier = Math.min(Math.max(10 / nodes.size, 1), 10)
  // very rough nodes height where units of 1 will ultimately become 1 second from the x-axis but on the y
  const apxNodesHeight = nodes.size * nodeMultiplier
  // rough nodes width where 1 will become 1 second on the x-axis
  const apxNodesWidth = apxNodesHeight * aspectRatio

  const idealMultiplier = apxNodesWidth / seconds

  return Math.min(Math.max(idealMultiplier, minimumScale), maximumScale)
}