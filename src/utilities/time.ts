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

export function getDateBounds(
  datesArray: { start: Date, end: Date | null }[],
): { min: Date, max: Date } {
  let min: Date | undefined
  let max: Date | undefined

  datesArray.forEach((dates) => {
    if (
      min === undefined
        || min > dates.start
        || isNaN(dates.start.getDate())
    ) {
      min = dates.start
    }

    if (
      dates.end !== null
      && (
        max === undefined
        || max < dates.end
        || isNaN(dates.end.getDate())
      )
    ) {
      max = dates.end
    }
  })

  return {
    min: min ?? new Date(NaN),
    max: max ?? new Date(NaN),
  }
}

export const timeLengths = {
  second: 1000,
  minute: 1000 * 60,
  hour: 1000 * 60 * 60,
  day: 1000 * 60 * 60 * 24,
  week: 1000 * 60 * 60 * 24 * 7,
}
export const timeSpanSlots = [
  {
    ceiling: timeLengths.second * 4,
    span: timeLengths.second,
    labelFormat: (date: Date) => date.toLocaleTimeString(),
  }, {
    ceiling: timeLengths.second * 8,
    span: timeLengths.second * 5,
    labelFormat: (date: Date) => date.toLocaleTimeString(),
  }, {
    ceiling: timeLengths.second * 13,
    span: timeLengths.second * 10,
    labelFormat: (date: Date) => date.toLocaleTimeString(),
  }, {
    ceiling: timeLengths.second * 20,
    span: timeLengths.second * 15,
    labelFormat: (date: Date) => date.toLocaleTimeString(),
  }, {
    ceiling: timeLengths.second * 45,
    span: timeLengths.second * 30,
    labelFormat: (date: Date) => date.toLocaleTimeString(),
  }, {
    ceiling: timeLengths.minute * 4,
    span: timeLengths.minute,
    labelFormat: (date: Date) => labelByMinutes(date),
  }, {
    ceiling: timeLengths.minute * 8,
    span: timeLengths.minute * 5,
    labelFormat: (date: Date) => labelByMinutes(date),
  }, {
    ceiling: timeLengths.minute * 13,
    span: timeLengths.minute * 10,
    labelFormat: (date: Date) => labelByMinutes(date),
  }, {
    ceiling: timeLengths.minute * 28,
    span: timeLengths.minute * 15,
    labelFormat: (date: Date) => labelByMinutes(date),
  }, {
    ceiling: timeLengths.hour * 1.24,
    span: timeLengths.minute * 30,
    labelFormat: (date: Date) => labelByMinutes(date),
  }, {
    ceiling: timeLengths.hour * 3,
    span: timeLengths.hour,
    labelFormat: (date: Date) => labelByMinutes(date),
  }, {
    ceiling: timeLengths.hour * 8,
    span: timeLengths.hour * 2,
    labelFormat: (date: Date) => labelByMinutes(date),
  }, {
    ceiling: timeLengths.hour * 13,
    span: timeLengths.hour * 6,
    labelFormat: (date: Date) => labelByMinutes(date),
  }, {
    ceiling: timeLengths.hour * 22,
    span: timeLengths.hour * 12,
    labelFormat: (date: Date) => labelByMinutes(date),
  }, {
    ceiling: timeLengths.day * 4,
    span: timeLengths.day,
    labelFormat: (date: Date) => labelByDay(date),
  }, {
    ceiling: timeLengths.week * 2,
    span: timeLengths.week,
    labelFormat: (date: Date) => labelByDay(date),
  }, {
    ceiling: Infinity,
    span: timeLengths.week * 4,
    labelFormat: (date: Date) => labelByDay(date),
  },
]

function labelByMinutes(date: Date): string {
  const currentLocale = navigator.language
  const time = new Intl.DateTimeFormat(currentLocale, { timeStyle: 'short' }).format(date)

  if (date.getHours() === 0 && date.getMinutes() === 0) {
    return `${new Intl.DateTimeFormat(currentLocale, { dateStyle: 'medium' }).format(date)}\n${time}`
  }

  return time
}

function labelByDay(date: Date): string {
  const currentLocale = navigator.language
  return new Intl.DateTimeFormat(currentLocale, { dateStyle: 'short' }).format(date)
}
