import { differenceInSeconds } from 'date-fns'
import { DEFAULT_TIME_COLUMN_SIZE_PIXELS } from '@/consts'
import { GraphData, RequiredGraphConfig } from '@/models/Graph'

export function getInitialHorizontalScaleMultiplier({ start, end, nodes }: GraphData, config: RequiredGraphConfig, aspectRatio: number): number {
  const seconds = Math.max(differenceInSeconds(end ?? new Date(), start), 1)

  const nodeHeight = config.styles.nodeHeight + config.styles.rowGap
  const apxConcurrencyFactor = 0.5
  const emptyNodesHeightMultiplier = 4

  const apxNodesHeight = nodes.size > 0
    ? nodes.size * nodeHeight * apxConcurrencyFactor
    : nodeHeight * emptyNodesHeightMultiplier

  const widthWeWant = apxNodesHeight * aspectRatio

  const idealMultiplier = widthWeWant / (seconds * DEFAULT_TIME_COLUMN_SIZE_PIXELS)

  return idealMultiplier
}