// Map<YAxis, Map<NodeId, offset>>
type Offsets = Map<number, Map<string, number> | undefined>

type SetOffsetParameters = {
  axis: number,
  nodeId: string,
  offset: number,
}

type RemoveOffsetParameters = {
  axis: number,
  nodeId: string,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function offsetsFactory() {
  const offsets: Offsets = new Map()

  function getOffset(axis: number): number {
    const values = offsets.get(axis)

    if (!values) {
      return 0
    }

    return Math.max(...values.values(), 0)
  }

  function getTotalOffset(axis: number): number {
    let value = 0

    for (let index = 1; index <= axis; index++) {
      value += getOffset(index)
    }

    return value
  }

  function setOffset({ axis, nodeId, offset }: SetOffsetParameters): void {
    const value = offsets.get(axis) ?? new Map<string, number>()

    value.set(nodeId, offset)

    offsets.set(axis, value)
  }

  function removeOffset({ axis, nodeId }: RemoveOffsetParameters): void {
    offsets.get(axis)?.delete(nodeId)
  }

  function clear(): void {
    offsets.clear()
  }

  return {
    getOffset,
    getTotalOffset,
    setOffset,
    removeOffset,
    clear,
  }
}