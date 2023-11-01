import { addSeconds } from 'date-fns'
import { reactive } from 'vue'
import { DEFAULT_LINEAR_COLUMN_SIZE_PIXELS, DEFAULT_TIME_COLUMN_SIZE_PIXELS, DEFAULT_TIME_COLUMN_SPAN_SECONDS } from '@/consts'
import { HorizontalMode, LayoutSettings, VerticalMode } from '@/models/layout'
import { waitForConfig } from '@/objects/config'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { waitForRunData } from '@/objects/nodes'
import { getInitialHorizontalScaleMultiplier } from '@/utilities/getInitialHorizontalScaleMultiplier'

export async function startSettings(): Promise<void> {
  const data = await waitForRunData()
  const config = await waitForConfig()
  const multiplier = getInitialHorizontalScaleMultiplier(data)

  setHorizontalScaleMultiplier(multiplier, true)

  if (data.nodes.size > config.disableAnimationsThreshold) {
    layout.disableAnimations = true
  }

  if (data.nodes.size > config.disableEdgesThreshold) {
    layout.disableEdges = true
  }

}

export function stopSettings(): void {
  layout.horizontalScaleMultiplierDefault = 0
  layout.horizontalScaleMultiplier = 0
}

export const layout = reactive<LayoutSettings>({
  horizontal: 'trace',
  vertical: 'nearest-parent',
  horizontalScaleMultiplierDefault: 0,
  horizontalScaleMultiplier: 0,
  disableAnimations: false,
  disableEdges: false,
  disableGuides: false,
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

export async function waitForSettings(): Promise<LayoutSettings> {
  if (initialized()) {
    return layout
  }

  return await waitForEvent('layoutCreated')
}

export function getHorizontalColumnSize(): number {
  if (layout.isDependency()) {
    return DEFAULT_LINEAR_COLUMN_SIZE_PIXELS
  }

  return DEFAULT_TIME_COLUMN_SIZE_PIXELS * layout.horizontalScaleMultiplier
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

export function setHorizontalScaleMultiplier(value: number, isDefaultValue: boolean = false): void {
  if (layout.horizontalScaleMultiplier === value) {
    return
  }

  const emit = emitFactory()

  layout.horizontalScaleMultiplier = value

  if (isDefaultValue) {
    layout.horizontalScaleMultiplierDefault = value
  }

  emit()
}

export function resetHorizontalScaleMultiplier(): void {
  setHorizontalScaleMultiplier(layout.horizontalScaleMultiplierDefault)
}

export function setLayoutMode({ horizontal, vertical }: LayoutSettings): void {
  if (layout.horizontal === horizontal && layout.vertical === vertical) {
    return
  }

  const emit = emitFactory()

  layout.horizontal = horizontal
  layout.vertical = vertical

  emit()
}

export function setHorizontalMode(mode: HorizontalMode): void {
  if (layout.horizontal === mode) {
    return
  }

  const emit = emitFactory()

  layout.horizontal = mode

  emit()
}

export function setVerticalMode(mode: VerticalMode): void {
  if (layout.vertical === mode) {
    return
  }

  const emit = emitFactory()

  layout.vertical = mode

  emit()
}

function emitFactory(): () => void {
  const event: EventKey = initialized() ? 'layoutUpdated' : 'layoutCreated'

  return () => {
    if (initialized()) {
      emitter.emit(event, layout)
    }
  }
}

function initialized(): boolean {
  return layout.horizontalScaleMultiplier !== 0
}