import {
  DateToX,
  XToDate,
  TimelineScale,
  InitTimelineScaleProps
} from '@/models'

export let timelineScale: {
  dateToX: DateToX,
  xToDate: XToDate,
}

// this function is also imported into the nodeLayout.worker, so
// it can't return the cached timelineScale
export const createTimelineScale = ({
  minimumStartTime,
  overallGraphWidth,
  initialOverallTimeSpan,
}: InitTimelineScaleProps): TimelineScale => {
  const newTimelineScale = {
    dateToX: createDateToXScale(
      minimumStartTime,
      overallGraphWidth,
      initialOverallTimeSpan,
    ),
    xToDate: createXToDateScale(
      minimumStartTime,
      overallGraphWidth,
      initialOverallTimeSpan,
    ),
  }

  return newTimelineScale
}

export const initTimelineScale = ({
  minimumStartTime,
  overallGraphWidth,
  initialOverallTimeSpan,
}: InitTimelineScaleProps): TimelineScale => {
  timelineScale = createTimelineScale({
    minimumStartTime,
    overallGraphWidth,
    initialOverallTimeSpan,
  })
  return timelineScale
}

function createDateToXScale(minStartTime: number, overallWidth: number, overallTimeSpan: number): DateToX {
  return function(date: Date): number {
    return Math.ceil((date.getTime() - minStartTime) * (overallWidth / overallTimeSpan))
  }
}

function createXToDateScale(minStartTime: number, overallWidth: number, overallTimeSpan: number): XToDate {
  return function(xPosition: number): number {
    return Math.ceil(minStartTime + xPosition * (overallTimeSpan / overallWidth))
  }
}