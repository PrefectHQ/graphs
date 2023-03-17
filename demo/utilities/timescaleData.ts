/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import { randomDate } from './randomDate'
import { randomStarName } from './randomStarName'
import { GraphTimelineNode } from '@/models'
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
  nodes: GraphTimelineNode[],
  zeroTimeGap?: boolean,
}

// This method assumes that at least 1 upstream dependency has been assigned an end date
const maxDate = (nodes: GraphTimelineNode[], property: keyof GraphTimelineNode, start: Date): Date => {
  return nodes.reduce((acc: Date, curr) => {
    const date = curr[property]

    if (!date) {
      return acc
    } else if (!(date instanceof Date)) {
      throw new Error(`Property ${property} is not a Date`)
    } else if (date > acc) {
      return date
    } else {
      return acc
    }
  }, start)
}

const assignStartAndEndDates = ({ start, end, size, nodes, zeroTimeGap }: AssignStartAndEndDates): (node: GraphTimelineNode) => void => {
  const minIncrement = (end.getTime() - start.getTime()) / size

  return (node: GraphTimelineNode) => {
    const upstreamDependencies = (node.upstreamDependencies ?? [])
      .map(id => nodes.find(nodeItem => nodeItem.id == id)) as GraphTimelineNode[]

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

const generateTimescaleData = (options?: DataOptions): GraphTimelineNode[] => {
  const nodes: GraphTimelineNode[] = []
  const { size = 5, shape = 'linear', fanMultiplier = 1, start = randomDate(), zeroTimeGap = false } = options ?? {}
  let end = options?.end ?? new Date()

  if (!options?.end) {
    end = randomDate(start)
  }

  // Create initial nodes
  while (nodes.length < size) {
    const isSubFlow = options?.subFlowOccurrence ? random() < options.subFlowOccurrence : false

    const target: GraphTimelineNode = {
      id: crypto.randomUUID(),
      upstreamDependencies: [],
      state: randomState(),
      label: randomStarName(),
      start: new Date(),
      end: null,
    }

    if (isSubFlow) {
      target.subFlowRunId = crypto.randomUUID()
    }

    const proxy = new Proxy(target, {})
    nodes.push(proxy)
  }

  // Create dependency tree
  if (shape == 'linear') {
    for (let i = 1; i < nodes.length; ++i) {
      nodes[i].upstreamDependencies = [nodes[i - 1].id]
    }
  }

  if (shape == 'fanOut' || shape == 'fanOutIn') {
    let row = 0
    const rows = []

    const incRow = (): void => {
      row++
      rows[row] = []
    }

    for (let i = 0; i < nodes.length; ++i) {
      if (row == 0) {
        rows.push([nodes[i]])
        incRow()
        continue
      }

      const currRow = rows[row]
      const prevRow = rows[row - 1]
      const currLen = currRow.length
      const prevLen = prevRow.length

      const upstreamNode = prevRow[floor(random() * prevLen)]

      nodes[i].upstreamDependencies = [upstreamNode.id]

      if (shape == 'fanOut') {
        if (currLen + 1 >= prevLen * fanMultiplier) {
          rows[row].push(nodes[i])
          incRow()
          continue
        }
      }

      if (shape == 'fanOutIn') {
        if (i > nodes.length / 2) {
          if ((currLen + 1) * fanMultiplier >= prevLen) {
            rows[row].push(nodes[i])
            incRow()
            continue
          }
        }

        if (currLen + 1 >= prevLen * fanMultiplier) {
          rows[row].push(nodes[i])
          incRow()
          continue
        }

      }

      rows[row].push(nodes[i])

      const addUpstreamDependency = (): void => {
        const upstreamNode = prevRow[floor(random() * prevLen)]
        if (!nodes[i].upstreamDependencies) {
          nodes[i].upstreamDependencies = []
        }
        nodes[i].upstreamDependencies!.push(upstreamNode.id)
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

  // Sort by start date
  nodes.sort((nodeA, nodeB) => nodeA.start.getTime() - nodeB.start.getTime())

  return nodes
}

export { generateTimescaleData }
