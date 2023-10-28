import { toValue } from 'vue'

type SetOffsetParameters = {
  axis: number,
  nodeId: string,
  offset: number,
}

type RemoveOffsetParameters = {
  axis: number,
  nodeId: string,
}

type MaybeGetter<T> = T | (() => T)

export type Offsets = Awaited<ReturnType<typeof offsetsFactory>>

export type OffsetParameters = {
  gap?: MaybeGetter<number>,
  minimum?: MaybeGetter<number>,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function offsetsFactory({ gap = 0, minimum = 0 }: OffsetParameters = {}) {
  const offsets: Map<number, Map<string, number> | undefined> = new Map()

  function getOffset(axis: number): number {
    const values = offsets.get(axis) ?? []
    const value = Math.max(...values.values(), toValue(minimum))
    const valueWithGap = value + toValue(gap)

    return valueWithGap
  }

  function getTotalOffset(axis: number): number {
    let value = 0

    for (let index = 0; index < axis; index++) {
      value += getOffset(index)
    }

    return value
  }

  function getTotalValue(axis: number): number {
    return getTotalOffset(axis + 1) - toValue(gap)
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
    getTotalValue,
    setOffset,
    removeOffset,
    clear,
  }
}