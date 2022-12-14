import { random, floor } from '../../src/math'

export type Shape = 'linear' | 'fanOut' | 'fanOutIn'
export type DataOptions = {
  shape?: Shape,
  size?: number,
  fanMultiplier?: number,
  color?: string
}

type Item = {
  id: string,
  upstream_dependencies: Item[],
  color?: string,
}

const generateData = (options?: DataOptions): Item[] => {
  const nodes: Item[] = []
  const { size = 3, shape = 'linear', fanMultiplier = 1, color } = options ?? {}

  // Create nodes
  while (nodes.length < size) {
    const target: Item = {
      id: crypto.randomUUID(),
      upstream_dependencies: [],
      color
    }
    const proxy = new Proxy(target, {})
    nodes.push(proxy)
  }

  // Create dependency tree
  if (shape == 'linear') {
    for (let i = 1; i < nodes.length; ++i) {
      nodes[i].upstream_dependencies = [nodes[i - 1]]
    }
  }

  if (shape == 'fanOut' || shape == 'fanOutIn') {
    let row = 0
    const rows = []

    const incRow = () => {
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

      nodes[i].upstream_dependencies = [upstreamNode]

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

  const target: Item = {
    id: crypto.randomUUID(),
    upstream_dependencies: [nodes[0], nodes[nodes.length - 1]],
    color
  }
  const proxy = new Proxy(target, {})
  nodes.push(proxy)

  return nodes
}

export { generateData }