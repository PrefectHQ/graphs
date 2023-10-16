import { HorizontalMode, LayoutMode, VerticalMode } from '@/models/layout'
import { emitter } from '@/objects/events'

export const layout: LayoutMode = {
  horizontal: 'time',
  vertical: 'waterfall',
}

export function setLayoutMode({ horizontal, vertical }: LayoutMode): void {
  layout.horizontal = horizontal
  layout.vertical = vertical

  emitter.emit('layoutUpdated', layout)
}

export function setHorizontalMode(mode: HorizontalMode): void {
  layout.horizontal = mode

  emitter.emit('layoutUpdated', layout)
}

export function setVerticalMode(mode: VerticalMode): void {
  layout.vertical = mode

  emitter.emit('layoutUpdated', layout)
}