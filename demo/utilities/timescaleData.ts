/* eslint-disable camelcase */
import { randomColor } from './randomColor'
import { randomDate } from './randomDate'
import { randomStarName } from './randomStarName'
import { random, floor } from '@/utilities/math'

export type Shape = 'linear' | 'fanOut' | 'fanOutIn'
export type DataOptions = {
  start?: Date,
  end?: Date,
  shape?: Shape,
  size?: number,
  fanMultiplier?: number,
}

type TimescaleItem = {
  id: string,
  label: string,
  start?: Date,
  end?: Date,
  upstreamDependencies: TimescaleItem[],
  color?: string,
}

// This method assumes that at least 1 upstream dependency has been assigned an end date
const maxDate = (nodes: TimescaleItem[], property: keyof TimescaleItem, start: Date): Date => {
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

const assignStartAndEndDates = (start: Date, end: Date, size: number): (node: TimescaleItem) => void => {
  const minIncrement = (end.getTime() - start.getTime()) / size

  return (node: TimescaleItem) => {
    const minStart = maxDate(node.upstreamDependencies, 'end', start)

    const jiggeredEndMs = minStart.getTime() + minIncrement
    const _start = randomDate(minStart, new Date(jiggeredEndMs))
    const _end = randomDate(_start, new Date(jiggeredEndMs + minIncrement))

    node.start = _start
    node.end = _end
  }
}

const generateTimescaleData = (options?: DataOptions): TimescaleItem[] => {
  const nodes: TimescaleItem[] = []
  const { size = 5, shape = 'linear', fanMultiplier = 1, start = randomDate() } = options ?? {}
  let end = options?.end ?? new Date()

  if (!options?.end) {
    end = randomDate(start)
  }

  // Create initial nodes
  while (nodes.length < size) {
    const target: TimescaleItem = {
      id: crypto.randomUUID(),
      upstreamDependencies: [],
      color: randomColor(),
      label: randomStarName(),
    }
    const proxy = new Proxy(target, {})
    nodes.push(proxy)
  }

  // Create dependency tree
  if (shape == 'linear') {
    for (let i = 1; i < nodes.length; ++i) {
      nodes[i].upstreamDependencies = [nodes[i - 1]]
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

      nodes[i].upstreamDependencies = [upstreamNode]

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

    }
  }

  // Assign start and end dates based on dependency tree
  nodes.forEach(assignStartAndEndDates(start, end, size))

  return nodes
}

export type { TimescaleItem }
export { generateTimescaleData }