import { reactive } from 'vue'
import { HorizontalMode, LayoutMode, VerticalMode } from '@/models/layout'
import { emitter } from '@/objects/events'

export const layout = reactive<LayoutMode>({
  horizontal: 'trace',
  vertical: 'nearest-parent',
  isTrace() {
    return this.horizontal === 'trace'
  },
  isDependency() {
    return this.horizontal === 'dependency'
  },
  isWaterfall() {
    return this.vertical === 'waterfall'
  },
  isNearestParent() {
    return this.vertical === 'nearest-parent'
  },
})

export function setLayoutMode({ horizontal, vertical }: LayoutMode): void {
  if (layout.horizontal === horizontal && layout.vertical === vertical) {
    return
  }

  layout.horizontal = horizontal
  layout.vertical = vertical

  emitter.emit('layoutUpdated', layout)
}

export function setHorizontalMode(mode: HorizontalMode): void {
  if (layout.horizontal === mode) {
    return
  }

  layout.horizontal = mode

  emitter.emit('layoutUpdated', layout)
}

export function setVerticalMode(mode: VerticalMode): void {
  if (layout.vertical === mode) {
    return
  }

  layout.vertical = mode

  emitter.emit('layoutUpdated', layout)
}