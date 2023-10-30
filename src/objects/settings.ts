import { addSeconds } from 'date-fns'
import { reactive } from 'vue'
import { DEFAULT_LINEAR_COLUMN_SIZE_PIXELS, DEFAULT_TIME_COLUMN_SIZE_PIXELS, DEFAULT_TIME_COLUMN_SPAN_SECONDS } from '@/consts'
import { HorizontalMode, LayoutSettings, VerticalMode } from '@/models/layout'
import { emitter } from '@/objects/events'

export const layout = reactive<LayoutSettings>({
  horizontal: 'trace',
  vertical: 'nearest-parent',
  horizontalScale: 1,
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

export function getHorizontalColumnSize(): number {
  if (layout.isDependency()) {
    return DEFAULT_LINEAR_COLUMN_SIZE_PIXELS * layout.horizontalScale
  }

  // I'm not actually sure there is a benefit to adding scale to the dependency layout
  return DEFAULT_TIME_COLUMN_SIZE_PIXELS * layout.horizontalScale
}

export function getHorizontalRange(): [number, number] {
  const columnSize = getHorizontalColumnSize()

  return [0, columnSize]
}

export function getHorizontalDomain(startTime: Date): [Date, Date] | [number, number] {
  if (layout.isDependency()) {
    return [0, 1]
  }

  const start = startTime
  const end = addSeconds(start, DEFAULT_TIME_COLUMN_SPAN_SECONDS)

  return [start, end]
}

export function setLayoutMode({ horizontal, vertical }: LayoutSettings): void {
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