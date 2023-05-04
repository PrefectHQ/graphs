import {
  DateToX,
  XToDate,
  TimeScale,
  TimeScaleArgs
} from '@/models'

export const createTimeScale = ({
  minimumStartTime,
  graphXDomain,
  initialOverallTimeSpan,
}: TimeScaleArgs): TimeScale => {
  return {
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
