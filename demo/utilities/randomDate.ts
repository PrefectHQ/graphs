import { random } from "@/math"

/**
 * A method that generates a random date (optional: between two dates)
 * @param start (optional) - defaults to random date in the past
 * @param end (optional) - defaults to now
 * @returns Date
 */
export const randomDate = (start?: Date, end?: Date): Date => {
  const _start = start?.getTime() ?? new Date().getTime() - random() * (1e+12)
  const _end = end?.getTime() ?? new Date().getTime()
  return new Date(_start + random() * (_end - _start))
}