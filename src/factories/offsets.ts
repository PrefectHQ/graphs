import { waitForConfig } from '@/objects/config'

type SetOffsetParameters = {
  axis: number,
  nodeId: string,
  offset: number,
}

type RemoveOffsetParameters = {
  axis: number,
  nodeId: string,
}

export type Offsets = Awaited<ReturnType<typeof offsetsFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function offsetsFactory() {
  const config = await waitForConfig()
  const offsets: Map<number, Map<string, number> | undefined> = new Map()

  function getOffset(axis: number): number {
    const values = offsets.get(axis) ?? []

    return Math.max(...values.values(), config.styles.nodeHeight)
  }

  function getTotalOffset(axis: number): number {
    let value = 0

    for (let index = 0; index < axis; index++) {
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