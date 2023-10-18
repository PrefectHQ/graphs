import { DEFAULT_LINEAR_COLUMN_SIZE_PIXELS, DEFAULT_TIME_COLUMN_SIZE_PIXELS, DEFAULT_TIME_COLUMN_SPAN_SECONDS } from '@/consts'
import { HorizontalPositionSettings } from '@/factories/position'
import { layout } from '@/objects/layout'

export function horizontalSettingsFactory(startTime: Date): HorizontalPositionSettings {
  return {
    mode: layout.horizontal,
    startTime,
    timeSpan: DEFAULT_TIME_COLUMN_SPAN_SECONDS,
    timeSpanPixels: DEFAULT_TIME_COLUMN_SIZE_PIXELS,
    dagColumnSize: DEFAULT_LINEAR_COLUMN_SIZE_PIXELS,
  }
}