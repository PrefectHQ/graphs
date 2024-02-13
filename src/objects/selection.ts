import { RunGraphNodeKind, runGraphNodeKinds } from '@/models'
import { GraphItemSelection, NodeSelection, SelectableItem } from '@/models/selection'
import { emitter } from '@/objects/events'
import { waitForViewport } from '@/objects/viewport'

let selected: GraphItemSelection | null = null
let selectionDisabled: boolean = false

export async function startSelection(): Promise<void> {
  const viewport = await waitForViewport()

  viewport.on('click', () => selectItem(null))

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

export function selectItem(item: GraphItemSelection | null): void {
  if (selectionDisabled) {
    return
  }

  if (isSelected(item)) {
    return
  }

  selected = item

  if (item === null) {
    emitter.emit('itemSelected', null)
    return
  }

  emitter.emit('itemSelected', item)
}

export function isSelected(item: GraphItemSelection | SelectableItem | null): boolean {
  if (item === null || selected === null) {
    return false
  }

  if (Array.isArray(item) && 'ids' in selected) {
    return item.length === selected.ids.length && selected.ids.every(id => item.includes(id))
  }

  if ('ids' in item && 'ids' in selected) {
    return item.ids.length === selected.ids.length && selected.ids.every(id => item.ids.includes(id))
  }

  if ('id' in item && 'id' in selected) {
    return item.id === selected.id
  }

  return false
}

export function getSelectedRunGraphNode(): NodeSelection | null {
  if (!!selected && runGraphNodeKinds.includes(selected.kind as RunGraphNodeKind)) {
    return selected as NodeSelection
  }

  return null
}

export function getSelected(): GraphItemSelection | null {
  return selected
}