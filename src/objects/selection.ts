import { RunGraphNode } from '@/models/RunGraph'
import { emitter } from '@/objects/events'
import { waitForViewport } from '@/objects/viewport'

let selected: Selection | null = null
let selectionDisabled: boolean = false

export type Selection = {
  id: string,
  kind: RunGraphNode['kind'],
}

export async function startSelection(): Promise<void> {
  const viewport = await waitForViewport()

  viewport.on('click', () => selectNode(null))

  // these drag events are to prevent selection from being cleared while dragging
  viewport.on('drag-start', () => {
    selectionDisabled = true
  })

  viewport.on('drag-end', () => {
    // drag-end gets emitted before the click event so we delay this until the
    // the next loop so the click event doesn't dismiss the selected node
    setTimeout(() => {
      selectionDisabled = false
    })
  })
}

export function stopSelection(): void {
  selected = null
  selectionDisabled = false
}

export function selectNode(node: RunGraphNode | null): void {
  if (selectionDisabled) {
    return
  }

  if (isSelected(node)) {
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

export function isSelected(node: RunGraphNode | null): boolean {
  return node?.id === selected?.id
}