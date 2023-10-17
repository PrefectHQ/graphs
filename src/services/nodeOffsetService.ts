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

export class NodeOffsetService {
  private readonly offsets: Offsets = new Map()

  public getOffset(axis: number): number {
    const values = this.offsets.get(axis)

    if (!values) {
      return 0
    }

    return Math.max(...values.values(), 0)
  }

  public getTotalOffset(axis: number): number {
    let value = 0

    for (let index = 1; index <= axis; index++) {
      value += this.getOffset(index)
    }

    return value
  }

  public setOffset({ axis, nodeId, offset }: SetOffsetParameters): void {
    const value = this.offsets.get(axis) ?? new Map<string, number>()

    value.set(nodeId, offset)

    this.offsets.set(axis, value)
  }

  public removeOffset({ axis, nodeId }: RemoveOffsetParameters): void {
    this.offsets.get(axis)?.delete(nodeId)
  }

  public clear(): void {
    this.offsets.clear()
  }
}