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
  graphXDomain,
  initialOverallTimeSpan,
}: InitTimelineScaleProps): TimelineScale => {
  const newTimelineScale = {
    dateToX: createDateToXScale(
      minimumStartTime,
      graphXDomain,
      initialOverallTimeSpan,
    ),
    xToDate: createXToDateScale(
      minimumStartTime,
      graphXDomain,
      initialOverallTimeSpan,
    ),
  }

  return newTimelineScale
}

export const initTimelineScale = ({
  minimumStartTime,
  graphXDomain,
  initialOverallTimeSpan,
}: InitTimelineScaleProps): TimelineScale => {
  timelineScale = createTimelineScale({
    minimumStartTime,
    graphXDomain,
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
  return function(xPosition: number): Date {
    return new Date(Math.ceil(minStartTime + xPosition * (overallTimeSpan / overallWidth)))
  }
}
