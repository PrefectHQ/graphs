import { RunGraphNode } from '@/models/RunGraph'
import { emitter } from '@/objects/events'
import { waitForViewport } from '@/objects/viewport'

let selected: Selection | null = null

export type Selection = {
  id: string,
  kind: RunGraphNode['kind'],
}

export async function startSelection(): Promise<void> {
  const viewport = await waitForViewport()

  viewport.on('click', () => selectNode(null))

}

export function stopSelection(): void {
  selected = null
}

export function selectNode(node: RunGraphNode | null): void {
  if (node?.id === selected?.id) {
    return
  }

  selected = node

  if (node === null) {
    emitter.emit('nodeSelected', null)
    return
  }

  const { id, kind } = node

  emitter.emit('nodeSelected', { id, kind })
}