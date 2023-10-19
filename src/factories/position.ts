import { scaleLinear, scaleTime } from 'd3'
import { addSeconds } from 'date-fns'
import { HorizontalMode, VerticalMode } from '@/models/layout'

export type VerticalPositionSettings = {
  mode: VerticalMode,
}

export type HorizontalPositionSettings = {
  mode: HorizontalMode,
  startTime: Date,
  timeSpan: number,
  timeSpanPixels: number,
  dependencyColumnSize: number,
}

export type HorizontalScale = ReturnType<typeof horizontalScaleFactory>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function horizontalScaleFactory(settings: HorizontalPositionSettings) {
  if (settings.mode === 'trace') {
    return getTimeScale(settings)
  }

  return getLinearScale(settings)
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getTimeScale({ startTime, timeSpan, timeSpanPixels }: HorizontalPositionSettings) {
  const start = startTime
  const end = addSeconds(start, timeSpan)

  // example: pixelsRange = 20, start = "2023-01-01T00:00:00"
  // scale("2023-01-01T00:00:00") = 0
  // scale("2023-01-01T00:00:01") = 20
  // scale("2023-01-01T00:00:05") = 100
  const scale = scaleTime().domain([start, end]).range([0, timeSpanPixels])

  return scale
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getLinearScale({ dependencyColumnSize }: HorizontalPositionSettings) {
  return scaleLinear().domain([0, 1]).range([0, dependencyColumnSize])
}