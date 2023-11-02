import { FormatDateFns } from '@/models/guides'

function formatDateBySeconds(date: Date): string {
  return date.toLocaleTimeString()
}
function formatDateByMinutes(date: Date): string {
  const currentLocale = navigator.language
  return new Intl.DateTimeFormat(currentLocale, { timeStyle: 'short' }).format(date)
}
function formatDate(date: Date): string {
  const currentLocale = navigator.language
  return new Intl.DateTimeFormat(currentLocale, { dateStyle: 'short' }).format(date)
}

function formatByMinutesWithDates(date: Date): string {
  if (date.getHours() === 0 && date.getMinutes() === 0) {
    return `${formatDateFns.date(date)}\n${formatDateByMinutes(date)}`
  }

  return formatDateByMinutes(date)
}

export const formatDateFns: FormatDateFns = {
  timeBySeconds: formatDateBySeconds,
  timeByMinutesWithDates: formatByMinutesWithDates,
  date: formatDate,
}

export const labelFormats = {
  seconds: 'seconds',
  minutes: 'minutes',
  date: 'date',
}

export const timeLengths = {
  second: 1000,
  minute: 1000 * 60,
  hour: 1000 * 60 * 60,
  day: 1000 * 60 * 60 * 24,
  week: 1000 * 60 * 60 * 24 * 7,
}

export const timeIncrements = [
  {
    ceiling: timeLengths.second * 4,
    increment: timeLengths.second,
    labelFormat: labelFormats.seconds,
  }, {
    ceiling: timeLengths.second * 8,
    increment: timeLengths.second * 5,
    labelFormat: labelFormats.seconds,
  }, {
    ceiling: timeLengths.second * 13,
    increment: timeLengths.second * 10,
    labelFormat: labelFormats.seconds,
  }, {
    ceiling: timeLengths.second * 20,
    increment: timeLengths.second * 15,
    labelFormat: labelFormats.seconds,
  }, {
    ceiling: timeLengths.second * 45,
    increment: timeLengths.second * 30,
    labelFormat: labelFormats.seconds,
  }, {
    ceiling: timeLengths.minute * 4,
    increment: timeLengths.minute,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.minute * 8,
    increment: timeLengths.minute * 5,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.minute * 13,
    increment: timeLengths.minute * 10,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.minute * 28,
    increment: timeLengths.minute * 15,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.hour * 1.24,
    increment: timeLengths.minute * 30,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.hour * 3,
    increment: timeLengths.hour,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.hour * 8,
    increment: timeLengths.hour * 2,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.hour * 13,
    increment: timeLengths.hour * 6,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.hour * 22,
    increment: timeLengths.hour * 12,
    labelFormat: labelFormats.minutes,
  }, {
    ceiling: timeLengths.day * 4,
    increment: timeLengths.day,
    labelFormat: labelFormats.date,
  }, {
    ceiling: timeLengths.week * 2,
    increment: timeLengths.week,
    labelFormat: labelFormats.date,
  }, {
    ceiling: Infinity,
    increment: timeLengths.week * 4,
    labelFormat: labelFormats.date,
  },
]