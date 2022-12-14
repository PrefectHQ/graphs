import { names, prefixes, suffixes } from '@/demo/utilities/starnames'
import { choice, weightedNumber, coinflip } from '@/utilities/math'


/**
 * @returns string - a random star name
 */
export const randomStarName = (): string => {
  const prefix = choice(prefixes).replace('RANDOM', weightedNumber().toString())
  const name = choice(names)
  const suffix = coinflip(0.6) ? choice(suffixes) : ''

  return [prefix, name, suffix].join('-').replace(/-+$/, '')
}
