// Map<YAxis, Map<NodeId, offset>>
type AxisBumps = Map<number, Map<string, number> | undefined>

type SetBumpParameters = {
  axis: number,
  nodeId: string,
  offset: number,
}

type RemoveBumpParameters = {
  axis: number,
  nodeId: string,
}

type BumpFactory = {
  get: (axis: number) => number,
  set: (value: SetBumpParameters) => void,
  delete: (value: RemoveBumpParameters) => void,
  bump: (axis: number) => number,
  clear: () => void,
}

export function axisBumpFactory(): BumpFactory {
  const bumps: AxisBumps = new Map()

  const get: BumpFactory['get'] = (axis) => {
    const values = bumps.get(axis)

    if (!values) {
      return 0
    }

    return Math.max(...values.values())
  }

  const set: BumpFactory['set'] = ({ axis, nodeId, offset }) => {
    const value = bumps.get(axis) ?? new Map<string, number>()

    value.set(nodeId, offset)
    bumps.set(axis, value)
  }

  const remove: BumpFactory['delete'] = ({ axis, nodeId }) => {
    bumps.get(axis)?.delete(nodeId)
  }

  const bump: BumpFactory['bump'] = (axis) => {
    let value = 0

    for (let index = 1; index <= axis; index++) {
      value += get(index)
    }

    return value
  }

  const clear: BumpFactory['clear'] = () => {
    bumps.clear()
  }

  return {
    get,
    set,
    delete: remove,
    bump,
    clear,
  }
}