/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import { randomDate } from './randomDate'
import { randomStarName } from './randomStarName'
import { TimelineData, TimelineItem } from '@/types/timeline'
import { random, floor } from '@/utilities/math'

export type TimelineNodeState =
  'completed'
  |'running'
  |'scheduled'
  |'pending'
  |'failed'
  |'cancelled'
  |'crashed'
  |'paused'

export type Shape = 'linear' | 'fanOut' | 'fanOutIn'
export type DataOptions = {
  start?: Date,
  end?: Date,
  shape?: Shape,
  size?: number,
  fanMultiplier?: number,
  subFlowOccurrence?: number,
  zeroTimeGap?: boolean,
}

type AssignStartAndEndDates = {
  start: Date,
  end: Date,
  size: number,
  nodes: TimelineData,
  zeroTimeGap?: boolean,
}

// This method assumes that at least 1 upstream dependency has been assigned an end date
const maxDate = (data: TimelineData, property: keyof TimelineItem, start: Date): Date => {
  let max: Date = start

  for (const [, item] of data) {
    const propertyValue = item[property]

    if (!propertyValue) {
      continue
    }

    if (!(propertyValue instanceof Date)) {
      throw new Error(`Property ${property} is not a Date`)
    }

    if (propertyValue.getTime() > max.getTime()) {
      max = propertyValue
    }
  }

  return max
}

const assignStartAndEndDates = ({ start, end, size, nodes, zeroTimeGap }: AssignStartAndEndDates): (node: TimelineItem) => void => {
  const minIncrement = (end.getTime() - start.getTime()) / size

  return (node: TimelineItem) => {
    const upstreamDependencies: TimelineData = new Map()

    node.upstream.forEach(id => upstreamDependencies.set(id, nodes.get(id)!))

    const minStart = maxDate(upstreamDependencies, 'end', start)
    const maxStart = new Date(minStart.getTime() + minIncrement / 2)
    const _start = zeroTimeGap ? minStart : randomDate(minStart, maxStart)

    const minEnd = new Date(_start.getTime() + minIncrement)
    const maxEnd = new Date(minEnd.getTime() + minIncrement * 1.25)
    const randomEnd = randomDate(minEnd, maxEnd)
    const _end = randomEnd.getTime() > end.getTime() ? end : randomEnd

    node.start = _start
    node.end = _end.getTime() > end.getTime() ? end : _end
  }
}

const randomState = (): TimelineNodeState => {
  // all but "running", since it's a special state
  const states: TimelineNodeState[] = [
    'completed',
    'scheduled',
    'pending',
    'failed',
    'cancelled',
    'crashed',
    'paused',
  ]

  return states[floor(random() * states.length)]
}

const generateTimescaleData = (options?: DataOptions): TimelineData => {
  const nodes: TimelineData = new Map()
  const { size = 5, shape = 'linear', fanMultiplier = 1, start = randomDate(), zeroTimeGap = false } = options ?? {}
  let end = options?.end ?? new Date()

  if (!options?.end) {
    end = randomDate(start)
  }

  // Create initial nodes
  while (nodes.size < size) {
    const isSubFlow = options?.subFlowOccurrence ? random() < options.subFlowOccurrence : false

    const target: TimelineItem = {
      id: crypto.randomUUID(),
      upstream: [],
      downstream: [],
      subflowRunId: null,
      state: randomState(),
      label: randomStarName(),
      start: new Date(),
      end: null,
    }

    if (isSubFlow) {
      target.subflowRunId = crypto.randomUUID()
    }

    nodes.set(target.id, target)
  }

  // Create dependency tree
  if (shape == 'linear') {
    const keys = Array.from(nodes.keys())

    for (const [i, key] of keys.entries()) {
      const item = nodes.get(key)!

      item.upstream = [keys[i - 1]]
    }
  }

  if (shape == 'fanOut' || shape == 'fanOutIn') {
    let row = 0
    const rows: TimelineItem[][] = []

    const incRow = (): void => {
      row++
      rows[row] = []
    }

    let index = -1
    for (const [, item] of nodes) {
      index++

      if (row == 0) {
        rows.push([item])
        incRow()
        continue
      }

      const currRow = rows[row]
      const prevRow = rows[row - 1]
      const currLen = currRow.length
      const prevLen = prevRow.length

      const upstreamNode = prevRow[floor(random() * prevLen)]

      item.upstream = [upstreamNode.id]

      if (shape == 'fanOut') {
        if (currLen + 1 >= prevLen * fanMultiplier) {
          rows[row].push(item)
          incRow()
          continue
        }
      }

      if (shape == 'fanOutIn') {
        if (index > nodes.size / 2) {
          if ((currLen + 1) * fanMultiplier >= prevLen) {
            rows[row].push(item)
            incRow()
            continue
          }
        }

        if (currLen + 1 >= prevLen * fanMultiplier) {
          rows[row].push(item)
          incRow()
          continue
        }

      }

      rows[row].push(item)

      const addUpstreamDependency = (): void => {
        const upstreamNode = prevRow[floor(random() * prevLen)]

        item.upstream!.push(upstreamNode.id)
      }

      /* eslint-disable curly */
      if (random() > 0.75) addUpstreamDependency()
      if (random() > 0.8) addUpstreamDependency()
      if (random() > 0.9) addUpstreamDependency()
      if (random() > 0.95) addUpstreamDependency()
      if (random() > 0.95) addUpstreamDependency()
      if (random() > 0.95) addUpstreamDependency()
      if (random() > 0.95) addUpstreamDependency()
      /* eslint-enable curly */

    }
  }

  // Assign start and end dates based on dependency tree
  nodes.forEach(assignStartAndEndDates({ start, end, size, nodes, zeroTimeGap }))

  return nodes
}

export { generateTimescaleData }
