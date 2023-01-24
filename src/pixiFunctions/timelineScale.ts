import {
  DateToX,
  XToDate,
  TimelineScale,
  InitTimelineScaleProps
} from '@/models'
import { createXToDateScale, createDateToXScale } from '@/utilities'

export let timelineScale: {
  dateToX: DateToX,
  xToDate: XToDate,
}

export const initTimelineScale = ({
  minimumStartTime,
  overallGraphWidth,
  initialOverallTimeSpan,
}: InitTimelineScaleProps): TimelineScale => {
  timelineScale = {
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

  return timelineScale
}
