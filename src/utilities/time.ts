import { GraphTimelineNode } from '..'

export const intervals = {
  year: 31536000,
  day: 86400,
  hour: 3600,
  minute: 60,
  second: 1,
} as const

type IntervalTypes = keyof typeof intervals
type IntervalTypesShort = 'y' | 'd' | 'h' | 'm' | 's'
type IntervalTypesPlural = `${keyof typeof intervals}s`

function aggregateSeconds(input: number): Record<IntervalTypesPlural, number> {
  const years = Math.floor(input / intervals.year)
  const days = Math.floor(input % intervals.year / intervals.day)
  const hours = Math.floor(input % intervals.year % intervals.day / intervals.hour)
  const minutes = Math.floor(input % intervals.year % intervals.day % intervals.hour / intervals.minute)
  const seconds = Math.ceil(input % intervals.year % intervals.day % intervals.hour % intervals.minute)

  return { years, days, hours, minutes, seconds }
}

function intervalStringSeconds(seconds: number, showOnes = true): string {
  return `${seconds === 1 && !showOnes ? '' : seconds}`
}

function intervalStringIntervalType(type: IntervalTypes, seconds: number, showOnes = true): string {
  return `${intervalStringSeconds(seconds, showOnes)} ${type}${seconds !== 1 ? 's' : ''}`
}

function intervalStringSecondsIntervalTypeShort(type: IntervalTypesShort, seconds: number, showOnes = true): string {
  return `${intervalStringSeconds(seconds, showOnes)}${type}`
}

export function secondsToString(input: number, showOnes = true): string {
  const { years, days, hours, minutes, seconds } = aggregateSeconds(input)
  const year = years ? intervalStringIntervalType('year', years, showOnes) : ''
  const day = days ? intervalStringIntervalType('day', days, showOnes) : ''
  const hour = hours ? intervalStringIntervalType('hour', hours, showOnes) : ''
  const minute = minutes ? intervalStringIntervalType('minute', minutes, showOnes) : ''
  const second = seconds ? intervalStringIntervalType('second', seconds, showOnes) : ''

  return [year, day, hour, minute, second].map(x => x ? x : '').join(' ')
}

export function secondsToApproximateString(input: number, showOnes = true): string {
  const { years, days, hours, minutes, seconds } = aggregateSeconds(input)
  const year = intervalStringSecondsIntervalTypeShort('y', years, showOnes)
  const day = intervalStringSecondsIntervalTypeShort('d', days, showOnes)
  const hour = intervalStringSecondsIntervalTypeShort('h', hours, showOnes)
  const minute = intervalStringSecondsIntervalTypeShort('m', minutes, showOnes)
  const second = intervalStringSecondsIntervalTypeShort('s', seconds, showOnes)

  switch (true) {
    case years > 0 && days == 0:
      return year
    case years > 0 && days > 0:
      return `${year} ${day}`
    case days > 0 && hours == 0:
      return day
    case days > 0 && hours > 0:
      return `${day} ${hour}`
    case hours > 0 && minutes == 0:
      return `${hour} ${minute}`
    case hours > 0 && minutes > 0:
      return `${hour} ${minute}`
    case minutes > 0 && seconds == 0:
      return minute
    case minutes > 0 && seconds > 0:
      return `${minute} ${second}`
    default:
      return second
  }
}

export function formatDateBySeconds(date: Date): string {
  return date.toLocaleTimeString()
}

export function formatDateByMinutes(date: Date): string {
  const currentLocale = navigator.language
  return new Intl.DateTimeFormat(currentLocale, { timeStyle: 'short' }).format(date)
}

export function formatDate(date: Date): string {
  const currentLocale = navigator.language
  return new Intl.DateTimeFormat(currentLocale, { dateStyle: 'short' }).format(date)
}

export function getDateBounds(
  data: GraphTimelineNode[],
  minimumTimeSpan: number = 0,
): { min: Date, max: Date, span: number } {

  const [minStartTime, maxStartTime] = data.reduce<[number | null, number | null]>(([min, max], { start, end }) => {
    const startTime = start?.getTime() ?? null
    const endTime = end?.getTime() ?? null

    if (startTime && min) {
      min = Math.min(min, startTime)
    }

    if (endTime && max) {
      max = Math.max(max, endTime)
    }

    return [min ?? startTime, max ?? endTime]
  }, [null, null])

  const min = minStartTime ? new Date(minStartTime) : new Date()
  let max = maxStartTime ? new Date(maxStartTime) : new Date()
  let span = max.getTime() - min.getTime()

  if (span < minimumTimeSpan) {
    max = new Date(min.getTime() + minimumTimeSpan)
    span = minimumTimeSpan
  }

  return {
    min,
    max,
    span,
  }
}

export function roundDownToNearestDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function roundDownToNearestEvenNumberedHour(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Math.floor(date.getHours() / 2) * 2,
  )
}

export const timeLengths = {
  second: 1000,
  minute: 1000 * 60,
  hour: 1000 * 60 * 60,
  day: 1000 * 60 * 60 * 24,
  week: 1000 * 60 * 60 * 24 * 7,
}

export const labelFormats = {
  seconds: 'seconds',
  minutes: 'minutes',
  date: 'date',
}

export const timeSpanSlots = [
  {
    ceiling: timeLengths.second * 4,
    span: timeLengths.second,
    labelFormat: labelFormats.seconds,
  }, {
    ceiling: timeLengths.second * 8,
    span: timeLengths.second * 5,
    labelFormat: labelFormats.seconds,
  }, {
    ceiling: timeLengths.second * 13,
    span: timeLengths.second * 10,
    labelFormat: labelFormats.seconds,
  }, {
    ceiling: timeLengths.second * 20,
    span: timeLengths.second * 15,
    labelFormat: labelFormats.seconds,
  }, {
    ceiling: timeLengths.second * 45,
    span: timeLengths.second * 30,
    labelFormat: labelFormats.seconds,
  }, {
    ceiling: timeLengths.minute * 4,
    span: timeLengths.minute,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.minute * 8,
    span: timeLengths.minute * 5,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.minute * 13,
    span: timeLengths.minute * 10,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.minute * 28,
    span: timeLengths.minute * 15,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.hour * 1.24,
    span: timeLengths.minute * 30,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.hour * 3,
    span: timeLengths.hour,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.hour * 8,
    span: timeLengths.hour * 2,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.hour * 13,
    span: timeLengths.hour * 6,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.hour * 22,
    span: timeLengths.hour * 12,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.day * 4,
    span: timeLengths.day,
    labelFormat: labelFormats.date,
  }, {
    ceiling: timeLengths.week * 2,
    span: timeLengths.week,
    labelFormat: labelFormats.date,
  }, {
    ceiling: Infinity,
    span: timeLengths.week * 4,
    labelFormat: labelFormats.date,
  },
]
