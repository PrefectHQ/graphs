/* eslint-disable id-length */
/* eslint-disable no-nested-ternary */
export const {
  abs,
  atan2,
  cos,
  max,
  min,
  sin,
  tan,
  sqrt,
  pow,
  floor,
  ceil,
  random,
} = Math

export const epsilon = 1e-12
export const pi = Math.PI
export const halfPi = pi / 2
export const tau = 2 * pi

export const acos = (x: number): number => {
  return x > 1 ? 0 : x < -1 ? pi : Math.acos(x)
}

export const asin = (x: number): number => {
  return x >= 1 ? halfPi : x <= -1 ? -halfPi : Math.asin(x)
}

export const pow2 = (n: number): number => {
  return n ** 2
}

export const choice = <T>(list: T[] | Readonly<T[]>): T => list[floor(random() * list.length)]

export const range = (min: number, max: number): number[] => Array.from({ length: max - min }, (x, i) => min + i)

export const uniform = (min: number, max: number): number => floor(random() * (max - min + 1) + min)

export const coinflip = (weight: number): boolean => uniform(0, 1) < weight

export const weightedNumber = (): number => {
  const seed = uniform(1, 3)

  if (seed == 1) {
    return choice(range(10, 100))
  }

  return choice(range(101, 1000))
}